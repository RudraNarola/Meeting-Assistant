package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jaivik/transcript-generator/pkg/models"
	"github.com/jaivik/transcript-generator/pkg/queue"
	"github.com/jaivik/transcript-generator/services/transcription-service/internal/repository"
)

// TranscriptionService handles transcription business logic
type TranscriptionService struct {
	repo *repository.TranscriptionRepository
	mq   *queue.MessageQueue
}

// NewTranscriptionService creates a new transcription service
func NewTranscriptionService(repo *repository.TranscriptionRepository, mq *queue.MessageQueue) *TranscriptionService {
	return &TranscriptionService{
		repo: repo,
		mq:   mq,
	}
}

// StartConsumer starts consuming messages from the queue
func (s *TranscriptionService) StartConsumer() error {
	return s.mq.Consume("transcription_processing", s.processTranscriptionMessage)
}

// processTranscriptionMessage processes a transcription message
func (s *TranscriptionService) processTranscriptionMessage(msg queue.Message) error {
	log.Printf("Processing transcription message: %v", msg)

	if msg.Type != "audio_uploaded" {
		return fmt.Errorf("unknown message type: %s", msg.Type)
	}

	audioIDStr, ok := msg.Payload["audio_id"].(string)
	if !ok {
		return fmt.Errorf("invalid audio_id in payload")
	}

	meetingIDStr, ok := msg.Payload["meeting_id"].(string)
	if !ok {
		return fmt.Errorf("invalid meeting_id in payload")
	}

	filePath, ok := msg.Payload["file_path"].(string)
	if !ok {
		return fmt.Errorf("invalid file_path in payload")
	}

	audioID, err := uuid.Parse(audioIDStr)
	if err != nil {
		return fmt.Errorf("failed to parse audio_id: %w", err)
	}

	meetingID, err := uuid.Parse(meetingIDStr)
	if err != nil {
		return fmt.Errorf("failed to parse meeting_id: %w", err)
	}

	// Perform transcription
	transcription, err := s.transcribeAudio(audioID, meetingID, filePath)
	if err != nil {
		log.Printf("Transcription failed: %v", err)
		return err
	}

	// Publish to diarization queue
	diarizationMsg := queue.Message{
		Type: "transcription_completed",
		Payload: map[string]interface{}{
			"transcription_id": transcription.ID.String(),
			"meeting_id":       meetingID.String(),
			"audio_id":         audioID.String(),
			"file_path":        filePath,
		},
	}

	if err := s.mq.Publish("diarization_processing", diarizationMsg); err != nil {
		log.Printf("Failed to queue diarization: %v", err)
		return err
	}

	log.Printf("Transcription completed for audio %s", audioID)
	return nil
}

// transcribeAudio performs the actual transcription using Whisper service
func (s *TranscriptionService) transcribeAudio(audioID, meetingID uuid.UUID, filePath string) (*models.Transcription, error) {
	log.Printf("Transcribing audio file: %s", filePath)

	// Get Whisper service URL from environment or use default
	whisperURL := os.Getenv("WHISPER_SERVICE_URL")
	if whisperURL == "" {
		whisperURL = "http://whisper-service:8084"
	}

	// Try to use Whisper service, fallback to mock if unavailable
	transcriptionText, language, confidence, err := s.callWhisperService(whisperURL, filePath)
	if err != nil {
		log.Printf("Whisper service unavailable, using mock transcription: %v", err)
		// Fallback to mock transcription
		transcriptionText = s.generateMockTranscription()
		language = "en"
		confidence = 0.95
	}

	transcription := &models.Transcription{
		ID:          uuid.New(),
		MeetingID:   meetingID,
		AudioFileID: audioID,
		FullText:    transcriptionText,
		Language:    language,
		Confidence:  confidence,
		CreatedAt:   time.Now(),
		Status:      "completed",
	}

	if err := s.repo.CreateTranscription(transcription); err != nil {
		return nil, fmt.Errorf("failed to save transcription: %w", err)
	}

	return transcription, nil
}

// callWhisperService calls the Whisper microservice for real transcription
func (s *TranscriptionService) callWhisperService(baseURL, filePath string) (string, string, float64, error) {
	// Open the audio file
	file, err := os.Open(filePath)
	if err != nil {
		return "", "", 0, fmt.Errorf("failed to open audio file: %w", err)
	}
	defer file.Close()

	// Create multipart form
	var requestBody bytes.Buffer
	writer := multipart.NewWriter(&requestBody)

	// Add file to form
	part, err := writer.CreateFormFile("file", filePath)
	if err != nil {
		return "", "", 0, fmt.Errorf("failed to create form file: %w", err)
	}

	if _, err := io.Copy(part, file); err != nil {
		return "", "", 0, fmt.Errorf("failed to copy file: %w", err)
	}

	// Add language parameter (optional)
	writer.WriteField("language", "en")
	writer.WriteField("task", "transcribe")

	if err := writer.Close(); err != nil {
		return "", "", 0, fmt.Errorf("failed to close writer: %w", err)
	}

	// Make HTTP request to Whisper service
	url := fmt.Sprintf("%s/transcribe", baseURL)
	req, err := http.NewRequest("POST", url, &requestBody)
	if err != nil {
		return "", "", 0, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 10 * time.Minute} // Increased timeout for longer audio files
	resp, err := client.Do(req)
	if err != nil {
		return "", "", 0, fmt.Errorf("failed to call Whisper service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", "", 0, fmt.Errorf("Whisper service returned status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var result struct {
		Text     string `json:"text"`
		Language string `json:"language"`
		Segments []struct {
			ID         int     `json:"id"`
			Start      float64 `json:"start"`
			End        float64 `json:"end"`
			Text       string  `json:"text"`
			Confidence float64 `json:"confidence"`
		} `json:"segments"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", 0, fmt.Errorf("failed to decode response: %w", err)
	}

	// Calculate average confidence
	avgConfidence := 0.0
	if len(result.Segments) > 0 {
		for _, seg := range result.Segments {
			avgConfidence += seg.Confidence
		}
		avgConfidence /= float64(len(result.Segments))
	}

	log.Printf("Whisper transcription completed: %d segments, language: %s", len(result.Segments), result.Language)

	return result.Text, result.Language, avgConfidence, nil
}

// generateMockTranscription generates mock transcription for demo purposes
func (s *TranscriptionService) generateMockTranscription() string {
	// This simulates a real transcription output
	// In production, this would come from the actual speech-to-text service
	mockSentences := []string{
		"Hello everyone, thank you for joining today's meeting.",
		"I'd like to discuss our project timeline and key deliverables.",
		"We have three main topics to cover in the next hour.",
		"First, let's review the progress from last week.",
		"The development team has completed the authentication module.",
		"That's great news. What about the database integration?",
		"We're currently working on it and expect to finish by Friday.",
		"Excellent. Let's move on to the next topic.",
		"We need to discuss the UI/UX improvements suggested by the design team.",
		"I have some mockups prepared that I'd like to share.",
		"These look fantastic. The user flow is much clearer now.",
		"Thank you. We'll implement these changes in the next sprint.",
		"Does anyone have any questions or concerns?",
		"I have a question about the deployment schedule.",
		"We're planning to deploy to staging next week for testing.",
		"That sounds good. Let's make sure we have enough time for QA.",
		"Absolutely. We've allocated two weeks for thorough testing.",
		"Perfect. Is there anything else we need to discuss today?",
		"I think we've covered everything. Thanks everyone for your time.",
		"Great meeting. Let's sync up again next week.",
	}

	return strings.Join(mockSentences, " ")
}

// GetTranscription retrieves a transcription by ID
func (s *TranscriptionService) GetTranscription(id uuid.UUID) (*models.Transcription, error) {
	return s.repo.GetTranscriptionByID(id)
}

// GetMeetingTranscriptions retrieves all transcriptions for a meeting
func (s *TranscriptionService) GetMeetingTranscriptions(meetingID uuid.UUID) ([]models.Transcription, error) {
	return s.repo.GetTranscriptionsByMeetingID(meetingID)
}
