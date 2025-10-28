package repository

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/jaivik/transcript-generator/pkg/models"
)

// AudioRepository handles audio-related database operations
type AudioRepository struct {
	db *sql.DB
}

// NewAudioRepository creates a new audio repository
func NewAudioRepository(db *sql.DB) *AudioRepository {
	return &AudioRepository{db: db}
}

// CreateMeeting creates a new meeting
func (r *AudioRepository) CreateMeeting(meeting *models.Meeting) error {
	query := `
		INSERT INTO meetings (id, title, platform, created_at, updated_at, status)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.Exec(query, meeting.ID, meeting.Title, meeting.Platform,
		meeting.CreatedAt, meeting.UpdatedAt, meeting.Status)
	return err
}

// GetMeetingByID retrieves a meeting by ID
func (r *AudioRepository) GetMeetingByID(id uuid.UUID) (*models.Meeting, error) {
	query := `
		SELECT id, title, platform, created_at, updated_at, status
		FROM meetings WHERE id = $1
	`
	meeting := &models.Meeting{}
	err := r.db.QueryRow(query, id).Scan(
		&meeting.ID, &meeting.Title, &meeting.Platform,
		&meeting.CreatedAt, &meeting.UpdatedAt, &meeting.Status,
	)
	if err != nil {
		return nil, err
	}
	return meeting, nil
}

// UpdateMeetingStatus updates meeting status
func (r *AudioRepository) UpdateMeetingStatus(id uuid.UUID, status string) error {
	query := `UPDATE meetings SET status = $1, updated_at = $2 WHERE id = $3`
	_, err := r.db.Exec(query, status, time.Now(), id)
	return err
}

// CreateAudioFile creates a new audio file record
func (r *AudioRepository) CreateAudioFile(audioFile *models.AudioFile) error {
	query := `
		INSERT INTO audio_files (id, meeting_id, video_id, filename, file_path, file_size, 
			duration, format, uploaded_at, processed)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.db.Exec(query, audioFile.ID, audioFile.MeetingID, audioFile.VideoID, audioFile.Filename,
		audioFile.FilePath, audioFile.FileSize, audioFile.Duration, audioFile.Format,
		audioFile.UploadedAt, audioFile.Processed)
	return err
}

// GetAudioFilesByMeetingID retrieves all audio files for a meeting
func (r *AudioRepository) GetAudioFilesByMeetingID(meetingID uuid.UUID) ([]models.AudioFile, error) {
	query := `
		SELECT id, meeting_id, video_id, filename, file_path, file_size, duration, 
			format, uploaded_at, processed
		FROM audio_files WHERE meeting_id = $1
		ORDER BY uploaded_at DESC
	`
	rows, err := r.db.Query(query, meetingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var audioFiles []models.AudioFile
	for rows.Next() {
		var af models.AudioFile
		err := rows.Scan(&af.ID, &af.MeetingID, &af.VideoID, &af.Filename, &af.FilePath,
			&af.FileSize, &af.Duration, &af.Format, &af.UploadedAt, &af.Processed)
		if err != nil {
			return nil, err
		}
		audioFiles = append(audioFiles, af)
	}
	return audioFiles, nil
}

// GetAudioFileByID retrieves an audio file by ID
func (r *AudioRepository) GetAudioFileByID(id uuid.UUID) (*models.AudioFile, error) {
	query := `
		SELECT id, meeting_id, video_id, filename, file_path, file_size, duration, 
			format, uploaded_at, processed
		FROM audio_files WHERE id = $1
	`
	audioFile := &models.AudioFile{}
	err := r.db.QueryRow(query, id).Scan(
		&audioFile.ID, &audioFile.MeetingID, &audioFile.VideoID, &audioFile.Filename, &audioFile.FilePath,
		&audioFile.FileSize, &audioFile.Duration, &audioFile.Format,
		&audioFile.UploadedAt, &audioFile.Processed,
	)
	if err != nil {
		return nil, err
	}
	return audioFile, nil
}

// MarkAudioFileProcessed marks an audio file as processed
func (r *AudioRepository) MarkAudioFileProcessed(id uuid.UUID) error {
	query := `UPDATE audio_files SET processed = true WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

// CreateVideoFile creates a new video file record
func (r *AudioRepository) CreateVideoFile(videoFile *models.VideoFile) error {
	query := `
		INSERT INTO video_files (id, meeting_id, filename, file_path, file_size, 
			duration, format, resolution, uploaded_at, audio_file_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.db.Exec(query, videoFile.ID, videoFile.MeetingID, videoFile.Filename,
		videoFile.FilePath, videoFile.FileSize, videoFile.Duration, videoFile.Format,
		videoFile.Resolution, videoFile.UploadedAt, videoFile.AudioFileID)
	return err
}

// GetVideoFilesByMeetingID retrieves all video files for a meeting
func (r *AudioRepository) GetVideoFilesByMeetingID(meetingID uuid.UUID) ([]models.VideoFile, error) {
	query := `
		SELECT id, meeting_id, filename, file_path, file_size, duration, 
			format, resolution, uploaded_at, audio_file_id
		FROM video_files WHERE meeting_id = $1
		ORDER BY uploaded_at DESC
	`
	rows, err := r.db.Query(query, meetingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var videoFiles []models.VideoFile
	for rows.Next() {
		var vf models.VideoFile
		err := rows.Scan(&vf.ID, &vf.MeetingID, &vf.Filename, &vf.FilePath,
			&vf.FileSize, &vf.Duration, &vf.Format, &vf.Resolution, 
			&vf.UploadedAt, &vf.AudioFileID)
		if err != nil {
			return nil, err
		}
		videoFiles = append(videoFiles, vf)
	}
	return videoFiles, nil
}
