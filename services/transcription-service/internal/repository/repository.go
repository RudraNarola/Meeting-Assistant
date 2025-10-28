package repository

import (
	"database/sql"

	"github.com/google/uuid"
	"github.com/jaivik/transcript-generator/pkg/models"
)

// TranscriptionRepository handles transcription-related database operations
type TranscriptionRepository struct {
	db *sql.DB
}

// NewTranscriptionRepository creates a new transcription repository
func NewTranscriptionRepository(db *sql.DB) *TranscriptionRepository {
	return &TranscriptionRepository{db: db}
}

// CreateTranscription creates a new transcription record
func (r *TranscriptionRepository) CreateTranscription(transcription *models.Transcription) error {
	query := `
		INSERT INTO transcriptions (id, meeting_id, audio_file_id, full_text, 
			language, confidence, created_at, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.Exec(query, transcription.ID, transcription.MeetingID,
		transcription.AudioFileID, transcription.FullText, transcription.Language,
		transcription.Confidence, transcription.CreatedAt, transcription.Status)
	return err
}

// GetTranscriptionByID retrieves a transcription by ID
func (r *TranscriptionRepository) GetTranscriptionByID(id uuid.UUID) (*models.Transcription, error) {
	query := `
		SELECT id, meeting_id, audio_file_id, full_text, language, 
			confidence, created_at, status
		FROM transcriptions WHERE id = $1
	`
	transcription := &models.Transcription{}
	err := r.db.QueryRow(query, id).Scan(
		&transcription.ID, &transcription.MeetingID, &transcription.AudioFileID,
		&transcription.FullText, &transcription.Language, &transcription.Confidence,
		&transcription.CreatedAt, &transcription.Status,
	)
	if err != nil {
		return nil, err
	}
	return transcription, nil
}

// GetTranscriptionsByMeetingID retrieves all transcriptions for a meeting
func (r *TranscriptionRepository) GetTranscriptionsByMeetingID(meetingID uuid.UUID) ([]models.Transcription, error) {
	query := `
		SELECT id, meeting_id, audio_file_id, full_text, language, 
			confidence, created_at, status
		FROM transcriptions WHERE meeting_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query, meetingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transcriptions []models.Transcription
	for rows.Next() {
		var t models.Transcription
		err := rows.Scan(&t.ID, &t.MeetingID, &t.AudioFileID, &t.FullText,
			&t.Language, &t.Confidence, &t.CreatedAt, &t.Status)
		if err != nil {
			return nil, err
		}
		transcriptions = append(transcriptions, t)
	}
	return transcriptions, nil
}

// UpdateTranscription updates a transcription
func (r *TranscriptionRepository) UpdateTranscription(transcription *models.Transcription) error {
	query := `
		UPDATE transcriptions 
		SET full_text = $1, confidence = $2, status = $3
		WHERE id = $4
	`
	_, err := r.db.Exec(query, transcription.FullText, transcription.Confidence,
		transcription.Status, transcription.ID)
	return err
}

// GetAudioFileByID retrieves an audio file by ID
func (r *TranscriptionRepository) GetAudioFileByID(id uuid.UUID) (*models.AudioFile, error) {
	query := `
		SELECT id, meeting_id, filename, file_path, file_size, duration, 
			format, uploaded_at, processed
		FROM audio_files WHERE id = $1
	`
	audioFile := &models.AudioFile{}
	err := r.db.QueryRow(query, id).Scan(
		&audioFile.ID, &audioFile.MeetingID, &audioFile.Filename, &audioFile.FilePath,
		&audioFile.FileSize, &audioFile.Duration, &audioFile.Format,
		&audioFile.UploadedAt, &audioFile.Processed,
	)
	if err != nil {
		return nil, err
	}
	return audioFile, nil
}
