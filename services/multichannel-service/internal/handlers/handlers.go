package handlers

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jaivik/transcript-generator/pkg/utils"
	"github.com/jaivik/transcript-generator/services/multichannel-service/internal/service"
)

type MultichannelHandler struct {
	service *service.MultichannelService
}

func NewMultichannelHandler(service *service.MultichannelService) *MultichannelHandler {
	return &MultichannelHandler{service: service}
}

// UploadMultichannel handles multichannel audio upload
func (h *MultichannelHandler) UploadMultichannel(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form (max 1GB)
	if err := r.ParseMultipartForm(1 << 30); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Failed to parse form data")
		return
	}

	// Get title and speaker names
	title := r.FormValue("title")
	if title == "" {
		title = "Untitled Multichannel Meeting"
	}

	speakerNamesStr := r.FormValue("speaker_names")
	var speakerNames []string
	if speakerNamesStr != "" {
		speakerNames = strings.Split(speakerNamesStr, ",")
		for i := range speakerNames {
			speakerNames[i] = strings.TrimSpace(speakerNames[i])
		}
	}

	// Get audio files
	files := r.MultipartForm.File["audio"]
	if len(files) == 0 {
		utils.RespondError(w, http.StatusBadRequest, "At least one audio file is required")
		return
	}

	log.Printf("Received %d audio files for multichannel upload", len(files))

	// Prepare audio files
	var audioFiles []service.AudioFile
	for i, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			utils.RespondError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to open file: %s", fileHeader.Filename))
			return
		}
		defer file.Close()

		// Read file data
		data, err := io.ReadAll(file)
		if err != nil {
			utils.RespondError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to read file: %s", fileHeader.Filename))
			return
		}

		// Determine speaker name
		var speakerName string
		if i < len(speakerNames) && speakerNames[i] != "" {
			speakerName = speakerNames[i]
		} else {
			// Extract speaker name from filename (remove extension)
			speakerName = strings.TrimSuffix(fileHeader.Filename, filepath.Ext(fileHeader.Filename))
			// Capitalize first letter
			if len(speakerName) > 0 {
				speakerName = strings.ToUpper(string(speakerName[0])) + speakerName[1:]
			}
		}

		audioFiles = append(audioFiles, service.AudioFile{
			SpeakerName: speakerName,
			Filename:    fileHeader.Filename,
			Data:        data,
			Size:        fileHeader.Size,
		})

		log.Printf("Prepared audio file for speaker: %s (filename: %s, size: %d bytes)",
			speakerName, fileHeader.Filename, fileHeader.Size)
	}

	// Process multichannel audio
	transcript, meeting, err := h.service.ProcessMultichannelAudio(title, audioFiles)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to process multichannel audio: %v", err))
		return
	}

	log.Printf("Successfully processed multichannel audio for meeting: %s", meeting.ID)

	// Prepare response
	response := map[string]interface{}{
		"meeting_id": meeting.ID,
		"meeting": map[string]interface{}{
			"id":         meeting.ID,
			"title":      meeting.Title,
			"platform":   meeting.Platform,
			"status":     meeting.Status,
			"created_at": meeting.CreatedAt,
			"updated_at": meeting.UpdatedAt,
		},
		"transcript": map[string]interface{}{
			"id":            transcript.TranscriptionID,
			"full_text":     transcript.FullText,
			"duration":      transcript.Duration,
			"speaker_count": transcript.SpeakerCount,
			"segment_count": transcript.SegmentCount,
		},
	}

	utils.RespondSuccess(w, "Multichannel audio processed successfully", response)
}

// GetMeetingStatus retrieves meeting status
func (h *MultichannelHandler) GetMeetingStatus(w http.ResponseWriter, r *http.Request) {
	meetingIDStr := chi.URLParam(r, "meetingID")
	meetingID, err := uuid.Parse(meetingIDStr)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid meeting ID")
		return
	}

	meeting, err := h.service.GetMeetingStatus(meetingID)
	if err != nil {
		utils.RespondError(w, http.StatusNotFound, "Meeting not found")
		return
	}

	utils.RespondJSON(w, http.StatusOK, meeting)
}

// GetTranscript retrieves the merged transcript
func (h *MultichannelHandler) GetTranscript(w http.ResponseWriter, r *http.Request) {
	meetingIDStr := chi.URLParam(r, "meetingID")
	meetingID, err := uuid.Parse(meetingIDStr)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid meeting ID")
		return
	}

	transcript, err := h.service.GetTranscript(meetingID)
	if err != nil {
		utils.RespondError(w, http.StatusNotFound, "Transcript not found")
		return
	}

	// Get meeting for additional context
	meeting, _ := h.service.GetMeetingStatus(meetingID)

	response := map[string]interface{}{
		"meeting_id":       transcript.MeetingID,
		"transcription_id": transcript.TranscriptionID,
		"full_text":        transcript.FullText,
		"duration":         transcript.Duration,
		"speaker_count":    transcript.SpeakerCount,
		"segment_count":    transcript.SegmentCount,
		"speakers":         transcript.Speakers,
		"transcript":       formatTranscriptSegments(transcript),
		"created_at":       meeting.CreatedAt,
	}

	utils.RespondJSON(w, http.StatusOK, response)
}

func formatTranscriptSegments(transcript *service.MergedTranscript) []map[string]interface{} {
	formatted := make([]map[string]interface{}, len(transcript.Segments))
	for i, seg := range transcript.Segments {
		formatted[i] = map[string]interface{}{
			"sequence":   i + 1,
			"speaker":    seg.Speaker,
			"text":       seg.Text,
			"start_time": seg.StartTime,
			"end_time":   seg.EndTime,
			"timestamp":  formatTimestamp(seg.StartTime),
			"confidence": seg.Confidence,
		}
	}
	return formatted
}

func formatTimestamp(seconds float64) string {
	hours := int(seconds) / 3600
	minutes := (int(seconds) % 3600) / 60
	secs := int(seconds) % 60
	return fmt.Sprintf("[%02d:%02d:%02d]", hours, minutes, secs)
}
