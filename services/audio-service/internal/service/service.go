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

	// Get audio metadata (simplified - in real app, use audio analysis library)
	format := filepath.Ext(filename)[1:]
	duration := 0.0 // TODO: Extract actual duration using ffmpeg or similar

	// Create audio file record
	audioFile := &models.AudioFile{
		ID:         audioID,
		MeetingID:  meetingID,
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

// GetAudioFiles retrieves all audio files for a meeting
func (s *AudioService) GetAudioFiles(meetingID uuid.UUID) ([]models.AudioFile, error) {
	return s.repo.GetAudioFilesByMeetingID(meetingID)
}

// GetMeeting retrieves a meeting by ID
func (s *AudioService) GetMeeting(meetingID uuid.UUID) (*models.Meeting, error) {
	return s.repo.GetMeetingByID(meetingID)
}
