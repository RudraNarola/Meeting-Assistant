package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jaivik/transcript-generator/pkg/utils"
	"github.com/jaivik/transcript-generator/services/api-gateway/internal/proxy"
)

// GatewayHandler handles HTTP requests for the API gateway
type GatewayHandler struct {
	proxy *proxy.ServiceProxy
}

// NewGatewayHandler creates a new gateway handler
func NewGatewayHandler(proxy *proxy.ServiceProxy) *GatewayHandler {
	return &GatewayHandler{proxy: proxy}
}

// UploadAudio handles audio file upload
func (h *GatewayHandler) UploadAudio(w http.ResponseWriter, r *http.Request) {
	// Forward the multipart request to audio service
	resp, err := h.proxy.ProxyMultipartRequest("audio", "/upload", r)
	if err != nil {
		utils.RespondError(w, http.StatusBadGateway, fmt.Sprintf("Failed to upload audio: %v", err))
		return
	}
	defer resp.Body.Close()

	// Copy response
	h.copyResponse(w, resp)
}

// GetAudioFiles retrieves audio files for a meeting
func (h *GatewayHandler) GetAudioFiles(w http.ResponseWriter, r *http.Request) {
	meetingID := chi.URLParam(r, "meetingID")
	path := fmt.Sprintf("/meetings/%s/audio", meetingID)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cacheKey := fmt.Sprintf("audio:meeting:%s", meetingID)
	data, err := h.proxy.GetWithCache(ctx, cacheKey, "audio", path, 5*time.Minute)
	
	if err != nil {
		utils.RespondError(w, http.StatusBadGateway, fmt.Sprintf("Failed to get audio files: %v", err))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

// GetTranscription retrieves a transcription
func (h *GatewayHandler) GetTranscription(w http.ResponseWriter, r *http.Request) {
	transcriptionID := chi.URLParam(r, "transcriptionID")
	path := fmt.Sprintf("/transcriptions/%s", transcriptionID)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cacheKey := fmt.Sprintf("transcription:%s", transcriptionID)
	data, err := h.proxy.GetWithCache(ctx, cacheKey, "transcription", path, 10*time.Minute)
	
	if err != nil {
		utils.RespondError(w, http.StatusBadGateway, fmt.Sprintf("Failed to get transcription: %v", err))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

// GetMeetingTranscriptions retrieves all transcriptions for a meeting
func (h *GatewayHandler) GetMeetingTranscriptions(w http.ResponseWriter, r *http.Request) {
	meetingID := chi.URLParam(r, "meetingID")
	path := fmt.Sprintf("/meetings/%s/transcriptions", meetingID)

	resp, err := h.proxy.ProxyRequest("transcription", path, http.MethodGet, nil, nil)
	if err != nil {
		utils.RespondError(w, http.StatusBadGateway, fmt.Sprintf("Failed to get transcriptions: %v", err))
		return
	}
	defer resp.Body.Close()

	h.copyResponse(w, resp)
}

// GetFullTranscript retrieves the complete transcript with speakers
func (h *GatewayHandler) GetFullTranscript(w http.ResponseWriter, r *http.Request) {
	meetingID := chi.URLParam(r, "meetingID")
	path := fmt.Sprintf("/meetings/%s/transcript", meetingID)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cacheKey := fmt.Sprintf("transcript:full:%s", meetingID)
	data, err := h.proxy.GetWithCache(ctx, cacheKey, "diarization", path, 5*time.Minute)
	
	if err != nil {
		utils.RespondError(w, http.StatusBadGateway, fmt.Sprintf("Failed to get transcript: %v", err))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

// GetSpeakers retrieves speakers for a meeting
func (h *GatewayHandler) GetSpeakers(w http.ResponseWriter, r *http.Request) {
	meetingID := chi.URLParam(r, "meetingID")
	path := fmt.Sprintf("/meetings/%s/speakers", meetingID)

	resp, err := h.proxy.ProxyRequest("diarization", path, http.MethodGet, nil, nil)
	if err != nil {
		utils.RespondError(w, http.StatusBadGateway, fmt.Sprintf("Failed to get speakers: %v", err))
		return
	}
	defer resp.Body.Close()

	h.copyResponse(w, resp)
}

// UpdateSpeaker updates speaker information
func (h *GatewayHandler) UpdateSpeaker(w http.ResponseWriter, r *http.Request) {
	speakerID := chi.URLParam(r, "speakerID")
	path := fmt.Sprintf("/speakers/%s", speakerID)

	// Read request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Failed to read request body")
		return
	}
	defer r.Body.Close()

	// Parse to get meeting ID for cache invalidation
	var reqData map[string]interface{}
	json.Unmarshal(body, &reqData)

	// Forward request
	resp, err := h.proxy.ProxyRequest("diarization", path, http.MethodPut, 
		io.NopCloser(io.Reader(io.MultiReader(io.MultiReader()))), 
		map[string]string{"Content-Type": "application/json"})
	
	if err != nil {
		utils.RespondError(w, http.StatusBadGateway, fmt.Sprintf("Failed to update speaker: %v", err))
		return
	}
	defer resp.Body.Close()

	// Invalidate related caches
	ctx := context.Background()
	h.proxy.InvalidateCache(ctx, "transcript:full:*")
	h.proxy.InvalidateCache(ctx, "speakers:*")

	h.copyResponse(w, resp)
}

// GetMeetingStatus retrieves the status of a meeting
func (h *GatewayHandler) GetMeetingStatus(w http.ResponseWriter, r *http.Request) {
	meetingID := chi.URLParam(r, "meetingID")
	path := fmt.Sprintf("/meetings/%s/audio", meetingID)

	resp, err := h.proxy.ProxyRequest("audio", path, http.MethodGet, nil, nil)
	if err != nil {
		utils.RespondError(w, http.StatusBadGateway, fmt.Sprintf("Failed to get meeting status: %v", err))
		return
	}
	defer resp.Body.Close()

	// Parse response to extract meeting info
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "Failed to parse response")
		return
	}

	// Extract meeting status
	meeting, ok := result["meeting"].(map[string]interface{})
	if !ok {
		utils.RespondError(w, http.StatusInternalServerError, "Invalid response format")
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"meeting_id": meetingID,
		"status":     meeting["status"],
		"title":      meeting["title"],
		"platform":   meeting["platform"],
		"created_at": meeting["created_at"],
		"updated_at": meeting["updated_at"],
	})
}

// copyResponse copies the response from a proxied request
func (h *GatewayHandler) copyResponse(w http.ResponseWriter, resp *http.Response) {
	// Copy headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Copy status code
	w.WriteHeader(resp.StatusCode)

	// Copy body
	io.Copy(w, resp.Body)
}
