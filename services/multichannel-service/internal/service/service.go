package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jaivik/transcript-generator/pkg/kafka"
	"github.com/jaivik/transcript-generator/pkg/models"
	"github.com/jaivik/transcript-generator/services/multichannel-service/internal/repository"
)

type MultichannelService struct {
	repo          *repository.MultichannelRepository
	kafkaProducer *kafka.Producer
}

func NewMultichannelService(repo *repository.MultichannelRepository, kafkaProducer *kafka.Producer) *MultichannelService {
	return &MultichannelService{
		repo:          repo,
		kafkaProducer: kafkaProducer,
	}
}

type AudioFile struct {
	SpeakerName string
	Filename    string
	Data        []byte
	Size        int64
}

type TranscriptSegment struct {
	Speaker    string  `json:"speaker"`
	Text       string  `json:"text"`
	StartTime  float64 `json:"start_time"`
	EndTime    float64 `json:"end_time"`
	Confidence float64 `json:"confidence"`
}

type MergedTranscript struct {
	MeetingID      uuid.UUID           `json:"meeting_id"`
	TranscriptionID uuid.UUID          `json:"transcription_id"`
	Segments       []TranscriptSegment `json:"segments"`
	FullText       string              `json:"full_text"`
	Duration       float64             `json:"duration"`
	SpeakerCount   int                 `json:"speaker_count"`
	SegmentCount   int                 `json:"segment_count"`
	Speakers       map[string]SpeakerStats `json:"speakers"`
}

type SpeakerStats struct {
	SegmentCount      int     `json:"segment_count"`
	TotalSpeakingTime float64 `json:"total_speaking_time"`
	Percentage        float64 `json:"percentage"`
}

// ProcessMultichannelAudio processes multiple audio files with individual speakers
func (s *MultichannelService) ProcessMultichannelAudio(title string, audioFiles []AudioFile) (*MergedTranscript, *models.Meeting, error) {
	log.Printf("Processing multichannel audio with %d speakers", len(audioFiles))

	// Create meeting
	meeting := &models.Meeting{
		ID:        uuid.New(),
		Title:     title,
		Platform:  "multichannel",
		Status:    "processing",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.repo.CreateMeeting(meeting); err != nil {
		return nil, nil, fmt.Errorf("failed to create meeting: %w", err)
	}
	log.Printf("Created meeting: %s", meeting.ID)

	// Process each audio file
	var allSegments []TranscriptSegment
	whisperURL := getEnv("WHISPER_SERVICE_URL", "http://localhost:8084")

	for i, audioFile := range audioFiles {
		log.Printf("[%d/%d] Processing audio for speaker: %s", i+1, len(audioFiles), audioFile.SpeakerName)

		// Transcribe audio
		segments, err := s.transcribeAudio(whisperURL, audioFile)
		if err != nil {
			log.Printf("Failed to transcribe %s: %v", audioFile.SpeakerName, err)
			continue
		}

		log.Printf("Transcribed %s: %d segments", audioFile.SpeakerName, len(segments))

		// Add speaker name to segments
		for _, seg := range segments {
			seg.Speaker = audioFile.SpeakerName
			allSegments = append(allSegments, seg)
		}
	}

	if len(allSegments) == 0 {
		return nil, nil, fmt.Errorf("no segments transcribed")
	}

	// Sort segments by start time
	sort.Slice(allSegments, func(i, j int) bool {
		return allSegments[i].StartTime < allSegments[j].StartTime
	})

	// Generate merged transcript
	merged := s.generateMergedTranscript(meeting.ID, allSegments)
	log.Printf("Generated merged transcript: %d segments, %.2f seconds", merged.SegmentCount, merged.Duration)

	// Save transcript to database
	transcription := &models.Transcription{
		ID:        merged.TranscriptionID,
		MeetingID: meeting.ID,
		FullText:  merged.FullText,
		CreatedAt: time.Now(),
	}

	if err := s.repo.SaveTranscript(transcription); err != nil {
		log.Printf("Warning: Failed to save transcript to database: %v", err)
	}

	// Update meeting status
	meeting.Status = "completed"
	meeting.UpdatedAt = time.Now()
	if err := s.repo.UpdateMeetingStatus(meeting.ID, "completed"); err != nil {
		log.Printf("Warning: Failed to update meeting status: %v", err)
	}

	log.Printf("Successfully processed multichannel audio for meeting: %s", meeting.ID)

	// Publish to Kafka for summary generation
	if s.kafkaProducer != nil {
		if err := s.publishToKafka(merged, meeting); err != nil {
			log.Printf("Warning: Failed to publish to Kafka: %v", err)
		}
	}

	return merged, meeting, nil
}

// transcribeAudio sends audio to Whisper service
func (s *MultichannelService) transcribeAudio(whisperURL string, audioFile AudioFile) ([]TranscriptSegment, error) {
	// Save audio to temp file
	tempFile := filepath.Join("/tmp", fmt.Sprintf("%s.wav", uuid.New().String()))
	if err := os.WriteFile(tempFile, audioFile.Data, 0644); err != nil {
		return nil, fmt.Errorf("failed to write temp file: %w", err)
	}
	defer os.Remove(tempFile)

	// Create multipart form
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Add file (Whisper expects "file" not "audio")
	part, err := writer.CreateFormFile("file", audioFile.Filename)
	if err != nil {
		return nil, err
	}
	if _, err := io.Copy(part, bytes.NewReader(audioFile.Data)); err != nil {
		return nil, err
	}
	
	// Add optional parameters
	writer.WriteField("language", "en")
	writer.WriteField("task", "transcribe")
	
	writer.Close()

	// Send to Whisper service
	req, err := http.NewRequest("POST", whisperURL+"/transcribe", body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 10 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Whisper service returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// Parse response
	var result struct {
		Segments []struct {
			Text       string  `json:"text"`
			StartTime  float64 `json:"start"`
			EndTime    float64 `json:"end"`
			Confidence float64 `json:"confidence"`
		} `json:"segments"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	// Convert to TranscriptSegment
	segments := make([]TranscriptSegment, len(result.Segments))
	for i, seg := range result.Segments {
		segments[i] = TranscriptSegment{
			Text:       strings.TrimSpace(seg.Text),
			StartTime:  seg.StartTime,
			EndTime:    seg.EndTime,
			Confidence: seg.Confidence,
		}
	}

	return segments, nil
}

// generateMergedTranscript creates a merged transcript from all segments
func (s *MultichannelService) generateMergedTranscript(meetingID uuid.UUID, segments []TranscriptSegment) *MergedTranscript {
	transcriptionID := uuid.New()
	
	var fullText strings.Builder
	speakerStats := make(map[string]*SpeakerStats)
	
	var maxEndTime float64
	for i, seg := range segments {
		// Format timestamp
		timestamp := formatTimestamp(seg.StartTime)
		fullText.WriteString(fmt.Sprintf("[%s] %s: %s\n", timestamp, seg.Speaker, seg.Text))
		
		// Update speaker stats
		if _, exists := speakerStats[seg.Speaker]; !exists {
			speakerStats[seg.Speaker] = &SpeakerStats{}
		}
		stats := speakerStats[seg.Speaker]
		stats.SegmentCount++
		stats.TotalSpeakingTime += (seg.EndTime - seg.StartTime)
		
		if seg.EndTime > maxEndTime {
			maxEndTime = seg.EndTime
		}
		
		// Update segment sequence
		segments[i].Speaker = seg.Speaker
	}
	
	// Calculate percentages
	for _, stats := range speakerStats {
		if maxEndTime > 0 {
			stats.Percentage = (stats.TotalSpeakingTime / maxEndTime) * 100
		}
	}
	
	// Convert map to struct
	speakersMap := make(map[string]SpeakerStats)
	for name, stats := range speakerStats {
		speakersMap[name] = *stats
	}
	
	return &MergedTranscript{
		MeetingID:       meetingID,
		TranscriptionID: transcriptionID,
		Segments:        segments,
		FullText:        fullText.String(),
		Duration:        maxEndTime,
		SpeakerCount:    len(speakerStats),
		SegmentCount:    len(segments),
		Speakers:        speakersMap,
	}
}

// publishToKafka publishes the transcript to Kafka for summary generation
func (s *MultichannelService) publishToKafka(transcript *MergedTranscript, meeting *models.Meeting) error {
	log.Printf("Publishing multichannel transcript to Kafka for meeting: %s", meeting.ID)

	// Prepare message payload
	payload := map[string]interface{}{
		"meeting_id":       meeting.ID.String(),
		"transcription_id": transcript.TranscriptionID.String(),
		"title":            meeting.Title,
		"platform":         meeting.Platform,
		"full_text":        transcript.FullText,
		"duration":         transcript.Duration,
		"segment_count":    transcript.SegmentCount,
		"speaker_count":    transcript.SpeakerCount,
		"created_at":       time.Now().Format(time.RFC3339),
	}

	// Publish to Kafka
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := s.kafkaProducer.Publish(ctx, meeting.ID.String(), payload); err != nil {
		return fmt.Errorf("failed to publish to Kafka: %w", err)
	}

	log.Printf("Successfully published multichannel transcript to Kafka for meeting: %s", meeting.ID)
	return nil
}

// GetTranscript retrieves the transcript for a meeting
func (s *MultichannelService) GetTranscript(meetingID uuid.UUID) (*MergedTranscript, error) {
	transcription, err := s.repo.GetTranscript(meetingID)
	if err != nil {
		return nil, err
	}

	// Parse the full text back into segments
	segments := []TranscriptSegment{}
	lines := strings.Split(transcription.FullText, "\n")
	
	speakersMap := make(map[string]bool)
	
	for _, line := range lines {
		if line == "" {
			continue
		}
		
		// Parse line format: [HH:MM:SS] Speaker: Text
		speaker := ""
		text := line
		
		// Extract speaker from format: [HH:MM:SS] Speaker: Text
		if strings.Contains(line, "] ") && strings.Contains(line, ": ") {
			parts := strings.SplitN(line, "] ", 2)
			if len(parts) == 2 {
				speakerAndText := parts[1]
				speakerParts := strings.SplitN(speakerAndText, ": ", 2)
				if len(speakerParts) == 2 {
					speaker = speakerParts[0]
					text = speakerParts[1]
					speakersMap[speaker] = true
				}
			}
		}
		
		segments = append(segments, TranscriptSegment{
			Speaker: speaker,
			Text:    text,
		})
	}
	
	// Convert speakers map to list
	speakers := make([]string, 0, len(speakersMap))
	for speaker := range speakersMap {
		speakers = append(speakers, speaker)
	}

	return &MergedTranscript{
		MeetingID:       meetingID,
		TranscriptionID: transcription.ID,
		FullText:        transcription.FullText,
		Duration:        0,
		SpeakerCount:    len(speakers),
		SegmentCount:    len(segments),
		Segments:        segments,
		Speakers:        make(map[string]SpeakerStats), // Empty for now, could be calculated if needed
	}, nil
}

// GetMeetingStatus retrieves meeting status
func (s *MultichannelService) GetMeetingStatus(meetingID uuid.UUID) (*models.Meeting, error) {
	return s.repo.GetMeeting(meetingID)
}

func formatTimestamp(seconds float64) string {
	hours := int(seconds) / 3600
	minutes := (int(seconds) % 3600) / 60
	secs := int(seconds) % 60
	return fmt.Sprintf("%02d:%02d:%02d", hours, minutes, secs)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
