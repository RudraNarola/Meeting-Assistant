package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jaivik/transcript-generator/services/api-gateway/internal/handlers"
	"github.com/jaivik/transcript-generator/services/api-gateway/internal/proxy"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

func main() {
	// Load environment variables
	godotenv.Load()

	// Redis client for caching
	redisURL := getEnv("REDIS_URL", "localhost:6379")
	redisClient := redis.NewClient(&redis.Options{
		Addr: redisURL,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Printf("Warning: Redis connection failed: %v", err)
	} else {
		log.Println("Connected to Redis")
	}

	// Service URLs
	serviceURLs := proxy.ServiceURLs{
		AudioService:         getEnv("AUDIO_SERVICE_URL", "http://localhost:8081"),
		TranscriptionService: getEnv("TRANSCRIPTION_SERVICE_URL", "http://localhost:8082"),
		DiarizationService:   getEnv("DIARIZATION_SERVICE_URL", "http://localhost:8083"),
		SummaryService:       getEnv("SUMMARY_SERVICE_URL", "http://localhost:8085"),
	}

	// Initialize proxy and handlers
	serviceProxy := proxy.NewServiceProxy(serviceURLs, redisClient)
	handler := handlers.NewGatewayHandler(serviceProxy)

	// Setup router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Requested-With"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"healthy","service":"api-gateway"}`))
	})

	// API routes
	r.Route("/api/v1", func(r chi.Router) {
		// Audio upload and meeting management
		r.Post("/meetings/upload", handler.UploadAudio)
		r.Post("/audio/upload", handler.UploadAudio) // Alias for convenience
		r.Get("/meetings/{meetingID}/audio", handler.GetAudioFiles)

		// Transcription endpoints
		r.Get("/transcriptions/{transcriptionID}", handler.GetTranscription)
		r.Get("/meetings/{meetingID}/transcriptions", handler.GetMeetingTranscriptions)

		// Speaker and full transcript endpoints
		r.Get("/meetings/{meetingID}/transcript", handler.GetFullTranscript)
		r.Get("/meetings/{meetingID}/speakers", handler.GetSpeakers)
		r.Put("/speakers/{speakerID}", handler.UpdateSpeaker)

		// Status endpoint
		r.Get("/meetings/{meetingID}/status", handler.GetMeetingStatus)

		// Summary endpoints
		r.Get("/summaries", handler.GetAllSummaries)
		r.Get("/summaries/{summaryID}", handler.GetSummaryByID)
		r.Get("/meetings/{meetingID}/summary", handler.GetSummaryByMeetingID)
		r.Delete("/summaries/{summaryID}", handler.DeleteSummary)
		r.Delete("/meetings/{meetingID}/summary", handler.DeleteSummaryByMeetingID)
	})

	// Start server
	port := getEnv("PORT", "8080")
	log.Printf("API Gateway starting on port %s", port)
	log.Printf("Audio Service: %s", serviceURLs.AudioService)
	log.Printf("Transcription Service: %s", serviceURLs.TranscriptionService)
	log.Printf("Diarization Service: %s", serviceURLs.DiarizationService)
	log.Printf("Summary Service: %s", serviceURLs.SummaryService)

	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
