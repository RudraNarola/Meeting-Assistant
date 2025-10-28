package repository

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/jaivik/transcript-generator/pkg/models"
)

// DiarizationRepository handles diarization-related database operations
type DiarizationRepository struct {
	db *sql.DB
}

// NewDiarizationRepository creates a new diarization repository
func NewDiarizationRepository(db *sql.DB) *DiarizationRepository {
	return &DiarizationRepository{db: db}
}

// CreateSpeaker creates a new speaker
func (r *DiarizationRepository) CreateSpeaker(speaker *models.Speaker) error {
	query := `
		INSERT INTO speakers (id, meeting_id, name, label, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := r.db.Exec(query, speaker.ID, speaker.MeetingID, speaker.Name,
		speaker.Label, speaker.CreatedAt)
	return err
}

// GetSpeakersByMeetingID retrieves all speakers for a meeting
func (r *DiarizationRepository) GetSpeakersByMeetingID(meetingID uuid.UUID) ([]models.Speaker, error) {
	query := `
		SELECT id, meeting_id, name, label, created_at
		FROM speakers WHERE meeting_id = $1
		ORDER BY label
	`
	rows, err := r.db.Query(query, meetingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var speakers []models.Speaker
	for rows.Next() {
		var s models.Speaker
		err := rows.Scan(&s.ID, &s.MeetingID, &s.Name, &s.Label, &s.CreatedAt)
		if err != nil {
			return nil, err
		}
		speakers = append(speakers, s)
	}
	return speakers, nil
}

// UpdateSpeaker updates speaker information
func (r *DiarizationRepository) UpdateSpeaker(speaker *models.Speaker) error {
	query := `UPDATE speakers SET name = $1 WHERE id = $2`
	_, err := r.db.Exec(query, speaker.Name, speaker.ID)
	return err
}

// GetSpeakerByID retrieves a speaker by ID
func (r *DiarizationRepository) GetSpeakerByID(id uuid.UUID) (*models.Speaker, error) {
	query := `
		SELECT id, meeting_id, name, label, created_at
		FROM speakers WHERE id = $1
	`
	speaker := &models.Speaker{}
	err := r.db.QueryRow(query, id).Scan(
		&speaker.ID, &speaker.MeetingID, &speaker.Name, &speaker.Label, &speaker.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return speaker, nil
}

// CreateTranscriptSegment creates a new transcript segment
func (r *DiarizationRepository) CreateTranscriptSegment(segment *models.TranscriptSegment) error {
	query := `
		INSERT INTO transcript_segments (id, transcription_id, speaker_id, text, 
			start_time, end_time, confidence, sequence_number, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.db.Exec(query, segment.ID, segment.TranscriptionID, segment.SpeakerID,
		segment.Text, segment.StartTime, segment.EndTime, segment.Confidence,
		segment.SequenceNumber, segment.CreatedAt)
	return err
}

// GetSegmentsByTranscriptionID retrieves all segments for a transcription
func (r *DiarizationRepository) GetSegmentsByTranscriptionID(transcriptionID uuid.UUID) ([]models.TranscriptSegment, error) {
	query := `
		SELECT ts.id, ts.transcription_id, ts.speaker_id, ts.text, ts.start_time, 
			ts.end_time, ts.confidence, ts.sequence_number, ts.created_at, 
			COALESCE(s.name, s.label) as speaker_name
		FROM transcript_segments ts
		LEFT JOIN speakers s ON ts.speaker_id = s.id
		WHERE ts.transcription_id = $1
		ORDER BY ts.sequence_number
	`
	rows, err := r.db.Query(query, transcriptionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var segments []models.TranscriptSegment
	for rows.Next() {
		var seg models.TranscriptSegment
		err := rows.Scan(&seg.ID, &seg.TranscriptionID, &seg.SpeakerID, &seg.Text,
			&seg.StartTime, &seg.EndTime, &seg.Confidence, &seg.SequenceNumber,
			&seg.CreatedAt, &seg.SpeakerName)
		if err != nil {
			return nil, err
		}
		segments = append(segments, seg)
	}
	return segments, nil
}

// GetTranscriptionByID retrieves a transcription by ID
func (r *DiarizationRepository) GetTranscriptionByID(id uuid.UUID) (*models.Transcription, error) {
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

// GetTranscriptionByMeetingID retrieves the latest transcription for a meeting
func (r *DiarizationRepository) GetTranscriptionByMeetingID(meetingID uuid.UUID) (*models.Transcription, error) {
	query := `
		SELECT id, meeting_id, audio_file_id, full_text, language, 
			confidence, created_at, status
		FROM transcriptions 
		WHERE meeting_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`
	transcription := &models.Transcription{}
	err := r.db.QueryRow(query, meetingID).Scan(
		&transcription.ID, &transcription.MeetingID, &transcription.AudioFileID,
		&transcription.FullText, &transcription.Language, &transcription.Confidence,
		&transcription.CreatedAt, &transcription.Status,
	)
	if err != nil {
		return nil, err
	}
	return transcription, nil
}

// GetMeetingByID retrieves a meeting by ID
func (r *DiarizationRepository) GetMeetingByID(id uuid.UUID) (*models.Meeting, error) {
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
func (r *DiarizationRepository) UpdateMeetingStatus(id uuid.UUID, status string) error {
	query := `UPDATE meetings SET status = $1, updated_at = $2 WHERE id = $3`
	_, err := r.db.Exec(query, status, time.Now(), id)
	return err
}
