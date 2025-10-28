package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jaivik/transcript-generator/pkg/utils"
	"github.com/jaivik/transcript-generator/services/transcription-service/internal/service"
)

// TranscriptionHandler handles HTTP requests for transcription service
type TranscriptionHandler struct {
	service *service.TranscriptionService
}

// NewTranscriptionHandler creates a new transcription handler
func NewTranscriptionHandler(service *service.TranscriptionService) *TranscriptionHandler {
	return &TranscriptionHandler{service: service}
}

// GetTranscription retrieves a transcription by ID
func (h *TranscriptionHandler) GetTranscription(w http.ResponseWriter, r *http.Request) {
	transcriptionIDStr := chi.URLParam(r, "transcriptionID")
	transcriptionID, err := uuid.Parse(transcriptionIDStr)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid transcription ID")
		return
	}

	transcription, err := h.service.GetTranscription(transcriptionID)
	if err != nil {
		utils.RespondError(w, http.StatusNotFound, "Transcription not found")
		return
	}

	utils.RespondJSON(w, http.StatusOK, transcription)
}

// GetMeetingTranscriptions retrieves all transcriptions for a meeting
func (h *TranscriptionHandler) GetMeetingTranscriptions(w http.ResponseWriter, r *http.Request) {
	meetingIDStr := chi.URLParam(r, "meetingID")
	meetingID, err := uuid.Parse(meetingIDStr)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid meeting ID")
		return
	}

	transcriptions, err := h.service.GetMeetingTranscriptions(meetingID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "Failed to retrieve transcriptions")
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"meeting_id":     meetingID,
		"transcriptions": transcriptions,
	})
}
