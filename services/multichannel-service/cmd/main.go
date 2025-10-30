package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jaivik/transcript-generator/pkg/kafka"
	"github.com/jaivik/transcript-generator/services/multichannel-service/internal/handlers"
	"github.com/jaivik/transcript-generator/services/multichannel-service/internal/repository"
	"github.com/jaivik/transcript-generator/services/multichannel-service/internal/service"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load environment variables
	godotenv.Load()

	// Database connection
	dbURL := getEnv("DATABASE_URL", "postgres://transcript_user:transcript_pass@localhost:5432/transcript_db?sslmode=disable")
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("Connected to PostgreSQL database")

	// Kafka producer connection
	var kafkaProducer *kafka.Producer
	kafkaBrokers := getEnv("KAFKA_BROKERS", "")
	if kafkaBrokers != "" {
		brokerList := kafka.ParseBrokers(kafkaBrokers)
		kafkaProducer = kafka.NewProducer(brokerList, "transcript-completed")
		defer kafkaProducer.Close()
		log.Println("Kafka producer initialized successfully")
	} else {
		log.Println("Kafka not configured, skipping Kafka producer initialization")
	}

	// Initialize repository and service
	repo := repository.NewMultichannelRepository(db)
	multichannelService := service.NewMultichannelService(repo, kafkaProducer)

	// Initialize handler
	handler := handlers.NewMultichannelHandler(multichannelService)

	// Setup router
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Routes
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Multichannel Service is healthy"))
	})

	r.Post("/upload", handler.UploadMultichannel)
	r.Get("/meetings/{meetingID}/status", handler.GetMeetingStatus)
	r.Get("/meetings/{meetingID}/transcript", handler.GetTranscript)

	// Start server
	port := getEnv("PORT", "8086")
	log.Printf("Multichannel Service starting on port %s", port)
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
