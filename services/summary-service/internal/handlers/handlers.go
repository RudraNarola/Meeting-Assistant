package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jaivik/transcript-generator/pkg/utils"
	"github.com/jaivik/transcript-generator/services/summary-service/internal/service"
)

// SummaryHandler handles HTTP requests for summary service
type SummaryHandler struct {
	service *service.SummaryService
}

// NewSummaryHandler creates a new summary handler
func NewSummaryHandler(service *service.SummaryService) *SummaryHandler {
	return &SummaryHandler{service: service}
}

// GetAllSummaries retrieves all summaries
func (h *SummaryHandler) GetAllSummaries(w http.ResponseWriter, r *http.Request) {
	summaries, err := h.service.GetAllSummaries()
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "Failed to retrieve summaries")
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"summaries": summaries,
		"count":     len(summaries),
	})
}

// GetSummaryByID retrieves a specific summary
func (h *SummaryHandler) GetSummaryByID(w http.ResponseWriter, r *http.Request) {
	summaryID := chi.URLParam(r, "summaryID")
	
	summary, err := h.service.GetSummaryByID(summaryID)
	if err != nil {
		utils.RespondError(w, http.StatusNotFound, "Summary not found")
		return
	}

	utils.RespondJSON(w, http.StatusOK, summary)
}

// GetSummaryByMeetingID retrieves a summary by meeting ID
func (h *SummaryHandler) GetSummaryByMeetingID(w http.ResponseWriter, r *http.Request) {
	meetingID := chi.URLParam(r, "meetingID")
	
	summary, err := h.service.GetSummaryByMeetingID(meetingID)
	if err != nil {
		utils.RespondError(w, http.StatusNotFound, "Summary not found for this meeting")
		return
	}

	utils.RespondJSON(w, http.StatusOK, summary)
}

// DeleteSummary deletes a summary
func (h *SummaryHandler) DeleteSummary(w http.ResponseWriter, r *http.Request) {
	summaryID := chi.URLParam(r, "summaryID")
	
	if err := h.service.DeleteSummary(summaryID); err != nil {
		utils.RespondError(w, http.StatusNotFound, "Summary not found")
		return
	}

	utils.RespondSuccess(w, "Summary deleted successfully", nil)
}
