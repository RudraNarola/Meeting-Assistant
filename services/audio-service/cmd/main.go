package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jaivik/transcript-generator/pkg/database"
	"github.com/jaivik/transcript-generator/pkg/queue"
	"github.com/jaivik/transcript-generator/services/audio-service/internal/handlers"
	"github.com/jaivik/transcript-generator/services/audio-service/internal/repository"
	"github.com/jaivik/transcript-generator/services/audio-service/internal/service"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	godotenv.Load()

	// Database connection
	dbConfig := database.Config{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     getEnv("DB_PORT", "5432"),
		User:     getEnv("DB_USER", "transcript_user"),
		Password: getEnv("DB_PASSWORD", "transcript_pass"),
		DBName:   getEnv("DB_NAME", "transcript_db"),
	}

	db, err := database.NewConnection(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Message queue connection
	mqURL := getEnv("RABBITMQ_URL", "amqp://admin:admin123@localhost:5672/")
	mq, err := queue.NewMessageQueue(mqURL)
	if err != nil {
		log.Fatalf("Failed to connect to message queue: %v", err)
	}
	defer mq.Close()

	// Declare queues
	mq.DeclareQueue("audio_processing")
	mq.DeclareQueue("transcription_processing")

	// Initialize repository and service
	repo := repository.NewAudioRepository(db)
	storagePath := getEnv("STORAGE_PATH", "./storage")
	audioService := service.NewAudioService(repo, mq, storagePath)

	// Initialize handlers
	handler := handlers.NewAudioHandler(audioService)

	// Setup router
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	// Routes
	r.Post("/upload", handler.UploadAudio)
	r.Get("/meetings/{meetingID}/audio", handler.GetAudioFiles)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Audio Service is healthy"))
	})

	// Start server
	port := getEnv("PORT", "8081")
	log.Printf("Audio Service starting on port %s", port)
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
