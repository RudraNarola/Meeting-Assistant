package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jaivik/transcript-generator/pkg/models"
	"github.com/jaivik/transcript-generator/pkg/utils"
	"github.com/jaivik/transcript-generator/services/diarization-service/internal/service"
)

// DiarizationHandler handles HTTP requests for diarization service
type DiarizationHandler struct {
	service *service.DiarizationService
}

// NewDiarizationHandler creates a new diarization handler
func NewDiarizationHandler(service *service.DiarizationService) *DiarizationHandler {
	return &DiarizationHandler{service: service}
}

// GetFullTranscript retrieves the complete transcript with speaker information
func (h *DiarizationHandler) GetFullTranscript(w http.ResponseWriter, r *http.Request) {
	meetingIDStr := chi.URLParam(r, "meetingID")
	meetingID, err := uuid.Parse(meetingIDStr)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid meeting ID")
		return
	}

	transcript, err := h.service.GetFullTranscript(meetingID)
	if err != nil {
		utils.RespondError(w, http.StatusNotFound, err.Error())
		return
	}

	utils.RespondJSON(w, http.StatusOK, transcript)
}

// GetSpeakers retrieves all speakers for a meeting
func (h *DiarizationHandler) GetSpeakers(w http.ResponseWriter, r *http.Request) {
	meetingIDStr := chi.URLParam(r, "meetingID")
	meetingID, err := uuid.Parse(meetingIDStr)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid meeting ID")
		return
	}

	speakers, err := h.service.GetSpeakers(meetingID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "Failed to retrieve speakers")
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"meeting_id": meetingID,
		"speakers":   speakers,
	})
}

// UpdateSpeaker updates speaker information (e.g., assigning a name)
func (h *DiarizationHandler) UpdateSpeaker(w http.ResponseWriter, r *http.Request) {
	speakerIDStr := chi.URLParam(r, "speakerID")
	speakerID, err := uuid.Parse(speakerIDStr)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid speaker ID")
		return
	}

	var req models.UpdateSpeakerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	speaker, err := h.service.UpdateSpeaker(speakerID, req.Name)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(w, "Speaker updated successfully", speaker)
}
