package utils

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
)

// ExtractAudioFromVideo extracts audio from a video file using FFmpeg
// Returns the path to the extracted audio file
func ExtractAudioFromVideo(videoPath, outputDir, audioID string) (string, float64, error) {
	// Generate output audio filename (WAV format for best compatibility)
	audioFilename := fmt.Sprintf("%s.wav", audioID)
	audioPath := filepath.Join(outputDir, audioFilename)

	// FFmpeg command to extract audio
	// -i: input file
	// -vn: no video
	// -acodec pcm_s16le: audio codec (uncompressed WAV)
	// -ar 16000: sample rate 16kHz (optimal for speech recognition)
	// -ac 1: mono audio
	cmd := exec.Command("ffmpeg",
		"-i", videoPath,
		"-vn",
		"-acodec", "pcm_s16le",
		"-ar", "16000",
		"-ac", "1",
		"-y", // overwrite output file if exists
		audioPath,
	)

	// Execute the command
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", 0, fmt.Errorf("ffmpeg failed: %w, output: %s", err, string(output))
	}

	// Get audio duration
	duration, err := GetAudioDuration(audioPath)
	if err != nil {
		return audioPath, 0, nil // Return path even if duration extraction fails
	}

	return audioPath, duration, nil
}

// GetAudioDuration gets the duration of an audio or video file using FFprobe
func GetAudioDuration(filePath string) (float64, error) {
	cmd := exec.Command("ffprobe",
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		filePath,
	)

	output, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("ffprobe failed: %w", err)
	}

	var duration float64
	_, err = fmt.Sscanf(strings.TrimSpace(string(output)), "%f", &duration)
	if err != nil {
		return 0, fmt.Errorf("failed to parse duration: %w", err)
	}

	return duration, nil
}

// GetVideoResolution gets the resolution of a video file using FFprobe
func GetVideoResolution(filePath string) (string, error) {
	cmd := exec.Command("ffprobe",
		"-v", "error",
		"-select_streams", "v:0",
		"-show_entries", "stream=width,height",
		"-of", "csv=s=x:p=0",
		filePath,
	)

	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("ffprobe failed: %w", err)
	}

	return strings.TrimSpace(string(output)), nil
}

// IsVideoFile checks if a file is a video based on its extension
func IsVideoFile(filename string) bool {
	videoExtensions := []string{".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv", ".wmv", ".m4v", ".mpeg", ".mpg"}
	ext := strings.ToLower(filepath.Ext(filename))
	
	for _, videoExt := range videoExtensions {
		if ext == videoExt {
			return true
		}
	}
	return false
}

// IsAudioFile checks if a file is an audio based on its extension
func IsAudioFile(filename string) bool {
	audioExtensions := []string{".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".wma", ".opus", ".webm"}
	ext := strings.ToLower(filepath.Ext(filename))
	
	for _, audioExt := range audioExtensions {
		if ext == audioExt {
			return true
		}
	}
	return false
}
