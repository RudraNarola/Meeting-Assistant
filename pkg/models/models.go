package models

import (
	"time"

	"github.com/google/uuid"
)

// Meeting represents a meeting session
type Meeting struct {
	ID        uuid.UUID `json:"id"`
	Title     string    `json:"title"`
	Platform  string    `json:"platform"` // "google_meet", "zoom"
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Status    string    `json:"status"` // "pending", "processing", "completed", "failed"
}

// AudioFile represents an uploaded audio file
type AudioFile struct {
	ID         uuid.UUID `json:"id"`
	MeetingID  uuid.UUID `json:"meeting_id"`
	Filename   string    `json:"filename"`
	FilePath   string    `json:"file_path"`
	FileSize   int64     `json:"file_size"`
	Duration   float64   `json:"duration"`
	Format     string    `json:"format"`
	UploadedAt time.Time `json:"uploaded_at"`
	Processed  bool      `json:"processed"`
}

// Transcription represents the full transcription
type Transcription struct {
	ID          uuid.UUID `json:"id"`
	MeetingID   uuid.UUID `json:"meeting_id"`
	AudioFileID uuid.UUID `json:"audio_file_id"`
	FullText    string    `json:"full_text"`
	Language    string    `json:"language"`
	Confidence  float64   `json:"confidence"`
	CreatedAt   time.Time `json:"created_at"`
	Status      string    `json:"status"`
}

// Speaker represents a speaker in the meeting
type Speaker struct {
	ID        uuid.UUID `json:"id"`
	MeetingID uuid.UUID `json:"meeting_id"`
	Name      string    `json:"name"`
	Label     string    `json:"label"` // "Speaker 1", "Speaker 2", etc.
	CreatedAt time.Time `json:"created_at"`
}

// TranscriptSegment represents a single phrase/sentence with speaker info
type TranscriptSegment struct {
	ID              uuid.UUID  `json:"id"`
	TranscriptionID uuid.UUID  `json:"transcription_id"`
	SpeakerID       *uuid.UUID `json:"speaker_id,omitempty"`
	SpeakerName     string     `json:"speaker_name,omitempty"`
	Text            string     `json:"text"`
	StartTime       float64    `json:"start_time"`
	EndTime         float64    `json:"end_time"`
	Confidence      float64    `json:"confidence"`
	SequenceNumber  int        `json:"sequence_number"`
	CreatedAt       time.Time  `json:"created_at"`
}

// CreateMeetingRequest is the request to create a new meeting
type CreateMeetingRequest struct {
	Title    string `json:"title"`
	Platform string `json:"platform"`
}

// UploadAudioRequest contains audio upload information
type UploadAudioRequest struct {
	MeetingID uuid.UUID `json:"meeting_id"`
	Filename  string    `json:"filename"`
}

// TranscriptResponse is the complete transcript with segments
type TranscriptResponse struct {
	Meeting   Meeting             `json:"meeting"`
	Speakers  []Speaker           `json:"speakers"`
	Segments  []TranscriptSegment `json:"segments"`
	FullText  string              `json:"full_text"`
	Duration  float64             `json:"duration"`
	CreatedAt time.Time           `json:"created_at"`
}

// UpdateSpeakerRequest updates speaker name
type UpdateSpeakerRequest struct {
	SpeakerID uuid.UUID `json:"speaker_id"`
	Name      string    `json:"name"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
	Code    int    `json:"code"`
}

// SuccessResponse represents a success response
type SuccessResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}
