package service

import (
	"fmt"
	"log"
	"math/rand"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jaivik/transcript-generator/pkg/models"
	"github.com/jaivik/transcript-generator/pkg/queue"
	"github.com/jaivik/transcript-generator/services/diarization-service/internal/repository"
)

// DiarizationService handles speaker diarization business logic
type DiarizationService struct {
	repo *repository.DiarizationRepository
	mq   *queue.MessageQueue
}

// NewDiarizationService creates a new diarization service
func NewDiarizationService(repo *repository.DiarizationRepository, mq *queue.MessageQueue) *DiarizationService {
	return &DiarizationService{
		repo: repo,
		mq:   mq,
	}
}

// StartConsumer starts consuming messages from the queue
func (s *DiarizationService) StartConsumer() error {
	return s.mq.Consume("diarization_processing", s.processDiarizationMessage)
}

// processDiarizationMessage processes a diarization message
func (s *DiarizationService) processDiarizationMessage(msg queue.Message) error {
	log.Printf("Processing diarization message: %v", msg)

	if msg.Type != "transcription_completed" {
		return fmt.Errorf("unknown message type: %s", msg.Type)
	}

	transcriptionIDStr, ok := msg.Payload["transcription_id"].(string)
	if !ok {
		return fmt.Errorf("invalid transcription_id in payload")
	}

	meetingIDStr, ok := msg.Payload["meeting_id"].(string)
	if !ok {
		return fmt.Errorf("invalid meeting_id in payload")
	}

	transcriptionID, err := uuid.Parse(transcriptionIDStr)
	if err != nil {
		return fmt.Errorf("failed to parse transcription_id: %w", err)
	}

	meetingID, err := uuid.Parse(meetingIDStr)
	if err != nil {
		return fmt.Errorf("failed to parse meeting_id: %w", err)
	}

	// Perform speaker diarization
	if err := s.performDiarization(transcriptionID, meetingID); err != nil {
		log.Printf("Diarization failed: %v", err)
		return err
	}

	// Update meeting status to completed
	if err := s.repo.UpdateMeetingStatus(meetingID, "completed"); err != nil {
		log.Printf("Failed to update meeting status: %v", err)
	}

	log.Printf("Diarization completed for transcription %s", transcriptionID)
	return nil
}

// performDiarization performs speaker diarization on the transcription
func (s *DiarizationService) performDiarization(transcriptionID, meetingID uuid.UUID) error {
	log.Printf("Performing speaker diarization for transcription: %s", transcriptionID)

	// Get transcription
	transcription, err := s.repo.GetTranscriptionByID(transcriptionID)
	if err != nil {
		return fmt.Errorf("failed to get transcription: %w", err)
	}

	// TODO: Implement actual speaker diarization using:
	// - Google Cloud Speech-to-Text with speaker diarization
	// - Azure Cognitive Services Speaker Recognition
	// - AWS Transcribe with speaker identification
	// - pyannote.audio or similar libraries
	
	// For now, create mock diarization
	// In production, you would:
	// 1. Analyze the audio file for different voice patterns
	// 2. Identify different speakers
	// 3. Segment the transcription by speaker
	// 4. Assign speaker labels to each segment

	// Simulate diarization delay
	time.Sleep(2 * time.Second)

	// Split transcription into sentences
	sentences := s.splitIntoSentences(transcription.FullText)

	// Determine number of speakers (mock - in real app, this comes from diarization)
	numSpeakers := s.detectNumberOfSpeakers(len(sentences))

	// Create speakers
	speakers := make([]models.Speaker, numSpeakers)
	for i := 0; i < numSpeakers; i++ {
		speaker := models.Speaker{
			ID:        uuid.New(),
			MeetingID: meetingID,
			Name:      "", // Name can be updated later by user
			Label:     fmt.Sprintf("Speaker %d", i+1),
			CreatedAt: time.Now(),
		}
		if err := s.repo.CreateSpeaker(&speaker); err != nil {
			return fmt.Errorf("failed to create speaker: %w", err)
		}
		speakers[i] = speaker
	}

	// Create transcript segments with speaker assignments
	currentTime := 0.0
	averageDuration := 5.0 // Average 5 seconds per sentence

	for i, sentence := range sentences {
		// Assign speaker (mock - in real app, this comes from diarization)
		speakerIndex := s.assignSpeaker(i, numSpeakers)
		speakerID := speakers[speakerIndex].ID

		// Calculate timing
		duration := averageDuration + (rand.Float64()*2 - 1) // Random variation
		startTime := currentTime
		endTime := currentTime + duration
		currentTime = endTime

		segment := models.TranscriptSegment{
			ID:              uuid.New(),
			TranscriptionID: transcriptionID,
			SpeakerID:       &speakerID,
			Text:            sentence,
			StartTime:       startTime,
			EndTime:         endTime,
			Confidence:      0.9 + (rand.Float64() * 0.1), // 0.9-1.0
			SequenceNumber:  i + 1,
			CreatedAt:       time.Now(),
		}

		if err := s.repo.CreateTranscriptSegment(&segment); err != nil {
			return fmt.Errorf("failed to create segment: %w", err)
		}
	}

	return nil
}

// splitIntoSentences splits text into sentences
func (s *DiarizationService) splitIntoSentences(text string) []string {
	// Simple sentence splitting (in production, use more sophisticated NLP)
	sentences := strings.Split(text, ". ")
	
	var result []string
	for _, sentence := range sentences {
		trimmed := strings.TrimSpace(sentence)
		if trimmed != "" {
			// Add period back if it was removed
			if !strings.HasSuffix(trimmed, ".") && 
			   !strings.HasSuffix(trimmed, "!") && 
			   !strings.HasSuffix(trimmed, "?") {
				trimmed += "."
			}
			result = append(result, trimmed)
		}
	}
	
	return result
}

// detectNumberOfSpeakers estimates the number of speakers (mock implementation)
func (s *DiarizationService) detectNumberOfSpeakers(numSentences int) int {
	// Mock logic - in real app, this comes from voice analysis
	if numSentences < 5 {
		return 1
	} else if numSentences < 15 {
		return 2
	} else {
		return 3
	}
}

// assignSpeaker assigns a speaker to a sentence (mock implementation)
func (s *DiarizationService) assignSpeaker(sentenceIndex, numSpeakers int) int {
	// Mock logic - in real app, this comes from voice matching
	// Simulate conversation patterns
	if numSpeakers == 1 {
		return 0
	} else if numSpeakers == 2 {
		// Alternate between speakers with occasional repeats
		if sentenceIndex%3 == 0 {
			return sentenceIndex % 2
		}
		return (sentenceIndex + 1) % 2
	} else {
		// Multiple speakers with varied patterns
		patterns := []int{0, 1, 1, 2, 0, 1, 2, 0, 0, 1}
		return patterns[sentenceIndex%len(patterns)] % numSpeakers
	}
}

// GetFullTranscript retrieves the complete transcript with speaker information
func (s *DiarizationService) GetFullTranscript(meetingID uuid.UUID) (*models.TranscriptResponse, error) {
	// Get meeting
	meeting, err := s.repo.GetMeetingByID(meetingID)
	if err != nil {
		return nil, fmt.Errorf("meeting not found: %w", err)
	}

	// Get transcription
	transcription, err := s.repo.GetTranscriptionByMeetingID(meetingID)
	if err != nil {
		return nil, fmt.Errorf("transcription not found: %w", err)
	}

	// Get speakers
	speakers, err := s.repo.GetSpeakersByMeetingID(meetingID)
	if err != nil {
		return nil, fmt.Errorf("failed to get speakers: %w", err)
	}

	// Get segments
	segments, err := s.repo.GetSegmentsByTranscriptionID(transcription.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get segments: %w", err)
	}

	// Calculate total duration
	var duration float64
	if len(segments) > 0 {
		duration = segments[len(segments)-1].EndTime
	}

	return &models.TranscriptResponse{
		Meeting:   *meeting,
		Speakers:  speakers,
		Segments:  segments,
		FullText:  transcription.FullText,
		Duration:  duration,
		CreatedAt: transcription.CreatedAt,
	}, nil
}

// GetSpeakers retrieves all speakers for a meeting
func (s *DiarizationService) GetSpeakers(meetingID uuid.UUID) ([]models.Speaker, error) {
	return s.repo.GetSpeakersByMeetingID(meetingID)
}

// UpdateSpeaker updates speaker information
func (s *DiarizationService) UpdateSpeaker(speakerID uuid.UUID, name string) (*models.Speaker, error) {
	speaker, err := s.repo.GetSpeakerByID(speakerID)
	if err != nil {
		return nil, fmt.Errorf("speaker not found: %w", err)
	}

	speaker.Name = name
	if err := s.repo.UpdateSpeaker(speaker); err != nil {
		return nil, fmt.Errorf("failed to update speaker: %w", err)
	}

	return speaker, nil
}
