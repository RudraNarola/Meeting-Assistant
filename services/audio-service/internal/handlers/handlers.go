package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jaivik/transcript-generator/pkg/utils"
	"github.com/jaivik/transcript-generator/services/audio-service/internal/service"
	fileutils "github.com/jaivik/transcript-generator/services/audio-service/internal/utils"
)

// AudioHandler handles HTTP requests for audio service
type AudioHandler struct {
	service *service.AudioService
}

// NewAudioHandler creates a new audio handler
func NewAudioHandler(service *service.AudioService) *AudioHandler {
	return &AudioHandler{service: service}
}

// UploadAudio handles audio file upload
func (h *AudioHandler) UploadAudio(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form (max 500MB)
	if err := r.ParseMultipartForm(500 << 20); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Failed to parse form data")
		return
	}

	// Get meeting ID and title
	meetingIDStr := r.FormValue("meeting_id")
	title := r.FormValue("title")
	platform := r.FormValue("platform")

	var meetingID uuid.UUID
	var err error

	// If meeting ID is not provided, create a new meeting
	if meetingIDStr == "" {
		if title == "" {
			title = "Untitled Meeting"
		}
		if platform == "" {
			platform = "unknown"
		}

		meeting, err := h.service.CreateMeeting(title, platform)
		if err != nil {
			utils.RespondError(w, http.StatusInternalServerError, "Failed to create meeting")
			return
		}
		meetingID = meeting.ID
	} else {
		meetingID, err = uuid.Parse(meetingIDStr)
		if err != nil {
			utils.RespondError(w, http.StatusBadRequest, "Invalid meeting ID")
			return
		}
	}

	// Try to get the file from form - support both "audio" and "file" field names
	file, header, err := r.FormFile("audio")
	if err != nil {
		file, header, err = r.FormFile("file")
		if err != nil {
			utils.RespondError(w, http.StatusBadRequest, "Audio or video file is required")
			return
		}
	}
	defer file.Close()

	filename := header.Filename

	// Check if it's a video file
	if fileutils.IsVideoFile(filename) {
		// Handle video upload with audio extraction
		videoFile, audioFile, err := h.service.SaveVideoFile(meetingID, filename, file)
		if err != nil {
			utils.RespondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		utils.RespondSuccess(w, "Video uploaded and audio extracted successfully", map[string]interface{}{
			"meeting_id": meetingID,
			"video_file": videoFile,
			"audio_file": audioFile,
			"message":    "Audio has been extracted from video and queued for transcription",
		})
		return
	}

	// Handle audio file upload
	if !fileutils.IsAudioFile(filename) {
		utils.RespondError(w, http.StatusBadRequest, "File must be an audio or video file")
		return
	}

	audioFile, err := h.service.SaveAudioFile(meetingID, filename, file)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(w, "Audio uploaded successfully", map[string]interface{}{
		"meeting_id": meetingID,
		"audio_file": audioFile,
	})
}

// GetAudioFiles retrieves all audio files for a meeting
func (h *AudioHandler) GetAudioFiles(w http.ResponseWriter, r *http.Request) {
	meetingIDStr := chi.URLParam(r, "meetingID")
	meetingID, err := uuid.Parse(meetingIDStr)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid meeting ID")
		return
	}

	// Get meeting
	meeting, err := h.service.GetMeeting(meetingID)
	if err != nil {
		utils.RespondError(w, http.StatusNotFound, "Meeting not found")
		return
	}

	// Get audio files
	audioFiles, err := h.service.GetAudioFiles(meetingID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "Failed to retrieve audio files")
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"meeting":     meeting,
		"audio_files": audioFiles,
	})
}

// GetVideoFiles retrieves all video files for a meeting
func (h *AudioHandler) GetVideoFiles(w http.ResponseWriter, r *http.Request) {
	meetingIDStr := chi.URLParam(r, "meetingID")
	meetingID, err := uuid.Parse(meetingIDStr)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid meeting ID")
		return
	}

	// Get meeting
	meeting, err := h.service.GetMeeting(meetingID)
	if err != nil {
		utils.RespondError(w, http.StatusNotFound, "Meeting not found")
		return
	}

	// Get video files
	videoFiles, err := h.service.GetVideoFiles(meetingID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "Failed to retrieve video files")
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"meeting":     meeting,
		"video_files": videoFiles,
	})
}
