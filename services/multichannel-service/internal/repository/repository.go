package repository

import (
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/jaivik/transcript-generator/pkg/models"
)

type MultichannelRepository struct {
	db *sql.DB
}

func NewMultichannelRepository(db *sql.DB) *MultichannelRepository {
	return &MultichannelRepository{db: db}
}

// CreateMeeting creates a new meeting
func (r *MultichannelRepository) CreateMeeting(meeting *models.Meeting) error {
	query := `
		INSERT INTO meetings (id, title, platform, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.Exec(query, meeting.ID, meeting.Title, meeting.Platform, meeting.Status, meeting.CreatedAt, meeting.UpdatedAt)
	return err
}

// GetMeeting retrieves a meeting by ID
func (r *MultichannelRepository) GetMeeting(meetingID uuid.UUID) (*models.Meeting, error) {
	meeting := &models.Meeting{}
	query := `
		SELECT id, title, platform, status, created_at, updated_at
		FROM meetings
		WHERE id = $1
	`
	err := r.db.QueryRow(query, meetingID).Scan(
		&meeting.ID,
		&meeting.Title,
		&meeting.Platform,
		&meeting.Status,
		&meeting.CreatedAt,
		&meeting.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return meeting, nil
}

// UpdateMeetingStatus updates meeting status
func (r *MultichannelRepository) UpdateMeetingStatus(meetingID uuid.UUID, status string) error {
	query := `
		UPDATE meetings
		SET status = $1, updated_at = NOW()
		WHERE id = $2
	`
	_, err := r.db.Exec(query, status, meetingID)
	return err
}

// SaveTranscript saves the transcript
func (r *MultichannelRepository) SaveTranscript(transcription *models.Transcription) error {
	query := `
		INSERT INTO transcriptions (id, meeting_id, full_text, created_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (id) DO UPDATE
		SET full_text = EXCLUDED.full_text
	`
	_, err := r.db.Exec(query,
		transcription.ID,
		transcription.MeetingID,
		transcription.FullText,
		transcription.CreatedAt,
	)
	return err
}

// GetTranscript retrieves transcript by meeting ID
func (r *MultichannelRepository) GetTranscript(meetingID uuid.UUID) (*models.Transcription, error) {
	transcription := &models.Transcription{}
	query := `
		SELECT id, meeting_id, full_text, created_at
		FROM transcriptions
		WHERE meeting_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`
	err := r.db.QueryRow(query, meetingID).Scan(
		&transcription.ID,
		&transcription.MeetingID,
		&transcription.FullText,
		&transcription.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("transcript not found: %w", err)
	}
	return transcription, nil
}
