package service

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/google/generative-ai-go/genai"
	"github.com/jaivik/transcript-generator/pkg/kafka"
	"github.com/jaivik/transcript-generator/services/summary-service/internal/repository"
	"google.golang.org/api/option"
)

// SummaryService handles summary business logic
type SummaryService struct {
	repo         *repository.SummaryRepository
	consumer     *kafka.Consumer
	geminiClient *genai.Client
	geminiModel  *genai.GenerativeModel
}

// NewSummaryService creates a new summary service
func NewSummaryService(repo *repository.SummaryRepository, consumer *kafka.Consumer) *SummaryService {
	service := &SummaryService{
		repo:     repo,
		consumer: consumer,
	}

	// Initialize Gemini AI client if API key is provided
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey != "" {
		ctx := context.Background()
		client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
		if err != nil {
			log.Printf("Warning: Failed to initialize Gemini client: %v", err)
		} else {
			service.geminiClient = client
			
			// Use gemini-2.5-flash (fast and available in current API)
			service.geminiModel = client.GenerativeModel("gemini-2.5-flash")
			// Configure generation settings
			service.geminiModel.SetTemperature(0.7)
			service.geminiModel.SetTopP(0.8)
			service.geminiModel.SetTopK(40)
			service.geminiModel.SetMaxOutputTokens(1024)
			log.Println("Gemini AI initialized successfully with model: gemini-2.5-flash")
		}
	} else {
		log.Println("GEMINI_API_KEY not set, using simple extractive summarization")
	}

	return service
}

// StartConsumer starts consuming transcript messages from Kafka
func (s *SummaryService) StartConsumer(ctx context.Context) error {
	log.Println("Starting Kafka consumer for transcript-completed topic")
	return s.consumer.Consume(ctx, s.processTranscriptMessage)
}

// processTranscriptMessage processes a transcript message and generates summary
func (s *SummaryService) processTranscriptMessage(msg kafka.Message) error {
	log.Printf("Processing transcript message: key=%s", msg.Key)

	// Extract data from message
	meetingID, _ := msg.Value["meeting_id"].(string)
	transcriptionID, _ := msg.Value["transcription_id"].(string)
	title, _ := msg.Value["title"].(string)
	platform, _ := msg.Value["platform"].(string)
	fullText, _ := msg.Value["full_text"].(string)
	duration, _ := msg.Value["duration"].(float64)
	speakersCount, _ := msg.Value["speakers_count"].(float64)
	segmentsCount, _ := msg.Value["segments_count"].(float64)

	if meetingID == "" || fullText == "" {
		return fmt.Errorf("missing required fields in message")
	}

	log.Printf("Generating summary for meeting: %s", meetingID)

	// Generate summary using AI
	summaryText, keyPoints := s.generateSummary(fullText)

	// Create summary record
	summary := &repository.Summary{
		MeetingID:       meetingID,
		TranscriptionID: transcriptionID,
		Title:           title,
		Platform:        platform,
		FullText:        fullText,
		SummaryText:     summaryText,
		KeyPoints:       keyPoints,
		Duration:        duration,
		SpeakersCount:   int(speakersCount),
		SegmentsCount:   int(segmentsCount),
	}

	// Save to MongoDB
	ctx := context.Background()
	if err := s.repo.Create(ctx, summary); err != nil {
		return fmt.Errorf("failed to save summary: %w", err)
	}

	log.Printf("Successfully created summary for meeting: %s (ID: %s)", meetingID, summary.ID)
	return nil
}

// generateSummary generates a summary from the full transcript using Gemini AI
func (s *SummaryService) generateSummary(fullText string) (summary string, keyPoints []string) {
	// Try to use Gemini AI if available
	if s.geminiClient != nil && s.geminiModel != nil {
		return s.generateSummaryWithGemini(fullText)
	}

	// Fallback to simple extractive summarization
	log.Println("Using fallback extractive summarization")
	return s.generateSimpleSummary(fullText)
}

// generateSummaryWithGemini uses Google Gemini AI to generate high-quality summaries
func (s *SummaryService) generateSummaryWithGemini(fullText string) (summary string, keyPoints []string) {
	ctx := context.Background()

	prompt := fmt.Sprintf(`You are an AI assistant that summarizes meeting transcripts. 

Please analyze the following meeting transcript and provide:
1. A concise summary (2-3 sentences) that captures the main discussion
2. A list of 5 key points or takeaways from the meeting

Meeting Transcript:
%s

Please format your response as:
SUMMARY: [your summary here]
KEY POINTS:
- [point 1]
- [point 2]
- [point 3]
- [point 4]
- [point 5]`, fullText)

	resp, err := s.geminiModel.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		log.Printf("Gemini API error: %v, falling back to simple summarization", err)
		return s.generateSimpleSummary(fullText)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		log.Println("No response from Gemini, falling back to simple summarization")
		return s.generateSimpleSummary(fullText)
	}

	// Parse the response
	responseText := fmt.Sprintf("%v", resp.Candidates[0].Content.Parts[0])
	
	// Extract summary and key points from formatted response
	lines := strings.Split(responseText, "\n")
	inKeyPoints := false
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		
		if strings.HasPrefix(line, "SUMMARY:") {
			summary = strings.TrimSpace(strings.TrimPrefix(line, "SUMMARY:"))
		} else if strings.HasPrefix(line, "KEY POINTS:") {
			inKeyPoints = true
		} else if inKeyPoints && strings.HasPrefix(line, "-") {
			point := strings.TrimSpace(strings.TrimPrefix(line, "-"))
			if point != "" {
				keyPoints = append(keyPoints, point)
			}
		} else if inKeyPoints && strings.HasPrefix(line, "*") {
			point := strings.TrimSpace(strings.TrimPrefix(line, "*"))
			if point != "" {
				keyPoints = append(keyPoints, point)
			}
		} else if summary != "" && !inKeyPoints && line != "" && !strings.Contains(line, "SUMMARY") {
			// Continue summary on next line
			summary += " " + line
		}
	}

	// If parsing failed, use the entire response as summary
	if summary == "" {
		summary = responseText
		if len(summary) > 500 {
			summary = summary[:500] + "..."
		}
	}

	// Ensure we have some key points
	if len(keyPoints) == 0 {
		keyPoints = s.extractSimpleKeyPoints(fullText)
	}

	log.Printf("Generated summary with Gemini AI: %d chars, %d key points", len(summary), len(keyPoints))
	return summary, keyPoints
}

// generateSimpleSummary is a fallback simple extractive summarization
func (s *SummaryService) generateSimpleSummary(fullText string) (summary string, keyPoints []string) {
	sentences := strings.Split(fullText, ". ")
	
	// Generate summary (first few sentences)
	summaryLength := 3
	if len(sentences) < summaryLength {
		summaryLength = len(sentences)
	}
	
	summarySentences := sentences[:summaryLength]
	summary = strings.Join(summarySentences, ". ")
	if !strings.HasSuffix(summary, ".") {
		summary += "."
	}

	// Extract key points
	keyPoints = s.extractSimpleKeyPoints(fullText)

	return summary, keyPoints
}

// extractSimpleKeyPoints extracts key points using simple heuristics
func (s *SummaryService) extractSimpleKeyPoints(fullText string) []string {
	sentences := strings.Split(fullText, ". ")
	keyPoints := []string{}
	
	for i := 0; i < len(sentences) && len(keyPoints) < 5; i += 5 {
		if sentences[i] != "" {
			keyPoint := strings.TrimSpace(sentences[i])
			if !strings.HasSuffix(keyPoint, ".") {
				keyPoint += "."
			}
			keyPoints = append(keyPoints, keyPoint)
		}
	}
	
	return keyPoints
}

// GetAllSummaries retrieves all summaries
func (s *SummaryService) GetAllSummaries() ([]repository.Summary, error) {
	ctx := context.Background()
	return s.repo.GetAll(ctx)
}

// GetSummaryByID retrieves a summary by ID
func (s *SummaryService) GetSummaryByID(id string) (*repository.Summary, error) {
	ctx := context.Background()
	return s.repo.GetByID(ctx, id)
}

// GetSummaryByMeetingID retrieves a summary by meeting ID
func (s *SummaryService) GetSummaryByMeetingID(meetingID string) (*repository.Summary, error) {
	ctx := context.Background()
	return s.repo.GetByMeetingID(ctx, meetingID)
}

// DeleteSummary deletes a summary by ID
func (s *SummaryService) DeleteSummary(id string) error {
	ctx := context.Background()
	return s.repo.Delete(ctx, id)
}

// DeleteSummaryByMeetingID deletes a summary by meeting ID
func (s *SummaryService) DeleteSummaryByMeetingID(meetingID string) error {
	ctx := context.Background()
	return s.repo.DeleteByMeetingID(ctx, meetingID)
}
