package service

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/jaivik/transcript-generator/pkg/models"
	"github.com/jaivik/transcript-generator/pkg/queue"
	"github.com/jaivik/transcript-generator/services/audio-service/internal/repository"
	"github.com/jaivik/transcript-generator/services/audio-service/internal/utils"
)

// AudioService handles audio processing business logic
type AudioService struct {
	repo        *repository.AudioRepository
	mq          *queue.MessageQueue
	storagePath string
}

// NewAudioService creates a new audio service
func NewAudioService(repo *repository.AudioRepository, mq *queue.MessageQueue, storagePath string) *AudioService {
	// Create storage directory if it doesn't exist
	os.MkdirAll(storagePath, 0755)
	return &AudioService{
		repo:        repo,
		mq:          mq,
		storagePath: storagePath,
	}
}

// CreateMeeting creates a new meeting
func (s *AudioService) CreateMeeting(title, platform string) (*models.Meeting, error) {
	meeting := &models.Meeting{
		ID:        uuid.New(),
		Title:     title,
		Platform:  platform,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Status:    "pending",
	}

	if err := s.repo.CreateMeeting(meeting); err != nil {
		return nil, err
	}

	return meeting, nil
}

// SaveAudioFile saves an audio file and triggers processing
func (s *AudioService) SaveAudioFile(meetingID uuid.UUID, filename string, file io.Reader) (*models.AudioFile, error) {
	// Verify meeting exists
	meeting, err := s.repo.GetMeetingByID(meetingID)
	if err != nil {
		return nil, fmt.Errorf("meeting not found: %w", err)
	}

	// Generate unique filename
	audioID := uuid.New()
	ext := filepath.Ext(filename)
	newFilename := fmt.Sprintf("%s%s", audioID.String(), ext)
	filePath := filepath.Join(s.storagePath, newFilename)

	// Create file
	outFile, err := os.Create(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}
	defer outFile.Close()

	// Copy file content
	fileSize, err := io.Copy(outFile, file)
	if err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	// Get audio metadata
	format := filepath.Ext(filename)[1:]
	duration, _ := utils.GetAudioDuration(filePath) // Ignore error, duration is optional

	// Create audio file record
	audioFile := &models.AudioFile{
		ID:         audioID,
		MeetingID:  meetingID,
		VideoID:    nil, // No video ID for direct audio upload
		Filename:   filename,
		FilePath:   filePath,
		FileSize:   fileSize,
		Duration:   duration,
		Format:     format,
		UploadedAt: time.Now(),
		Processed:  false,
	}

	if err := s.repo.CreateAudioFile(audioFile); err != nil {
		// Clean up file if database insert fails
		os.Remove(filePath)
		return nil, fmt.Errorf("failed to create audio record: %w", err)
	}

	// Update meeting status
	if meeting.Status == "pending" {
		s.repo.UpdateMeetingStatus(meetingID, "processing")
	}

	// Publish message to transcription queue
	msg := queue.Message{
		Type: "audio_uploaded",
		Payload: map[string]interface{}{
			"audio_id":   audioID.String(),
			"meeting_id": meetingID.String(),
			"file_path":  filePath,
		},
	}

	if err := s.mq.Publish("transcription_processing", msg); err != nil {
		return nil, fmt.Errorf("failed to queue transcription: %w", err)
	}

	return audioFile, nil
}

// SaveVideoFile saves a video file, extracts audio, and triggers processing
func (s *AudioService) SaveVideoFile(meetingID uuid.UUID, filename string, file io.Reader) (*models.VideoFile, *models.AudioFile, error) {
	// Verify meeting exists
	meeting, err := s.repo.GetMeetingByID(meetingID)
	if err != nil {
		return nil, nil, fmt.Errorf("meeting not found: %w", err)
	}

	// Generate unique filename for video
	videoID := uuid.New()
	ext := filepath.Ext(filename)
	newVideoFilename := fmt.Sprintf("%s%s", videoID.String(), ext)
	videoPath := filepath.Join(s.storagePath, newVideoFilename)

	// Create and save video file
	outFile, err := os.Create(videoPath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create video file: %w", err)
	}
	defer outFile.Close()

	// Copy video file content
	videoSize, err := io.Copy(outFile, file)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to save video file: %w", err)
	}

	// Extract audio from video
	audioID := uuid.New()
	audioPath, duration, err := utils.ExtractAudioFromVideo(videoPath, s.storagePath, audioID.String())
	if err != nil {
		os.Remove(videoPath) // Clean up video file
		return nil, nil, fmt.Errorf("failed to extract audio from video: %w", err)
	}

	// Get audio file size
	audioInfo, err := os.Stat(audioPath)
	var audioSize int64
	if err == nil {
		audioSize = audioInfo.Size()
	}

	// Get video metadata
	resolution, _ := utils.GetVideoResolution(videoPath)
	videoDuration, _ := utils.GetAudioDuration(videoPath)

	// Create video file record FIRST (before audio, since audio references video)
	videoFile := &models.VideoFile{
		ID:          videoID,
		MeetingID:   meetingID,
		Filename:    filename,
		FilePath:    videoPath,
		FileSize:    videoSize,
		Duration:    videoDuration,
		Format:      ext[1:],
		Resolution:  resolution,
		UploadedAt:  time.Now(),
		AudioFileID: audioID, // Link to extracted audio
	}

	if err := s.repo.CreateVideoFile(videoFile); err != nil {
		// Clean up files if database insert fails
		os.Remove(videoPath)
		os.Remove(audioPath)
		return nil, nil, fmt.Errorf("failed to create video record: %w", err)
	}

	// Create audio file record SECOND (after video exists)
	audioFile := &models.AudioFile{
		ID:         audioID,
		MeetingID:  meetingID,
		VideoID:    &videoID, // Link to video file
		Filename:   filename + ".wav", // Extracted audio filename
		FilePath:   audioPath,
		FileSize:   audioSize,
		Duration:   duration,
		Format:     "wav",
		UploadedAt: time.Now(),
		Processed:  false,
	}

	if err := s.repo.CreateAudioFile(audioFile); err != nil {
		// Clean up files if database insert fails
		os.Remove(videoPath)
		os.Remove(audioPath)
		// Note: video_file record already exists, but CASCADE delete will handle it if meeting is deleted
		return nil, nil, fmt.Errorf("failed to create audio record: %w", err)
	}

	// Update meeting status
	if meeting.Status == "pending" {
		s.repo.UpdateMeetingStatus(meetingID, "processing")
	}

	// Publish message to transcription queue
	msg := queue.Message{
		Type: "audio_uploaded",
		Payload: map[string]interface{}{
			"audio_id":   audioID.String(),
			"meeting_id": meetingID.String(),
			"file_path":  audioPath,
			"video_id":   videoID.String(),
			"source":     "video_extraction",
		},
	}

	if err := s.mq.Publish("transcription_processing", msg); err != nil {
		return nil, nil, fmt.Errorf("failed to queue transcription: %w", err)
	}

	return videoFile, audioFile, nil
}

// GetAudioFiles retrieves all audio files for a meeting
func (s *AudioService) GetAudioFiles(meetingID uuid.UUID) ([]models.AudioFile, error) {
	return s.repo.GetAudioFilesByMeetingID(meetingID)
}

// GetMeeting retrieves a meeting by ID
func (s *AudioService) GetMeeting(meetingID uuid.UUID) (*models.Meeting, error) {
	return s.repo.GetMeetingByID(meetingID)
}

// GetVideoFiles retrieves all video files for a meeting
func (s *AudioService) GetVideoFiles(meetingID uuid.UUID) ([]models.VideoFile, error) {
	return s.repo.GetVideoFilesByMeetingID(meetingID)
}
