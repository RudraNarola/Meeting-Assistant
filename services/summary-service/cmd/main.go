package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jaivik/transcript-generator/pkg/kafka"
	"github.com/jaivik/transcript-generator/services/summary-service/internal/handlers"
	"github.com/jaivik/transcript-generator/services/summary-service/internal/repository"
	"github.com/jaivik/transcript-generator/services/summary-service/internal/service"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	// Load environment variables
	godotenv.Load()

	// MongoDB connection
	mongoURI := getEnv("MONGO_URI", "mongodb://admin:admin123@localhost:27017")
	mongoDatabase := getEnv("MONGO_DATABASE", "transcript_summaries")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer mongoClient.Disconnect(context.Background())

	// Test connection
	if err := mongoClient.Ping(ctx, nil); err != nil {
		log.Fatalf("Failed to ping MongoDB: %v", err)
	}
	log.Println("Successfully connected to MongoDB")

	// Kafka consumer
	kafkaBrokers := getEnv("KAFKA_BROKERS", "localhost:9093")
	kafkaTopic := getEnv("KAFKA_TOPIC", "transcript-completed")
	kafkaGroupID := getEnv("KAFKA_GROUP_ID", "summary-service-group")

	brokerList := kafka.ParseBrokers(kafkaBrokers)
	consumer := kafka.NewConsumer(brokerList, kafkaTopic, kafkaGroupID)
	defer consumer.Close()

	log.Printf("Kafka consumer configured: brokers=%v, topic=%s, group=%s", brokerList, kafkaTopic, kafkaGroupID)

	// Initialize repository and service
	repo := repository.NewSummaryRepository(mongoClient, mongoDatabase, "summaries")
	summaryService := service.NewSummaryService(repo, consumer)

	// Initialize handlers
	handler := handlers.NewSummaryHandler(summaryService)

	// Start Kafka consumer in goroutine
	ctx, cancel = context.WithCancel(context.Background())
	defer cancel()

	go func() {
		log.Println("Starting Kafka consumer...")
		if err := summaryService.StartConsumer(ctx); err != nil {
			log.Printf("Kafka consumer error: %v", err)
		}
	}()

	// Setup HTTP router
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
	r.Get("/summaries", handler.GetAllSummaries)
	r.Get("/summaries/{summaryID}", handler.GetSummaryByID)
	r.Get("/meetings/{meetingID}/summary", handler.GetSummaryByMeetingID)
	r.Delete("/summaries/{summaryID}", handler.DeleteSummary)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Summary Service is healthy"))
	})

	// Start HTTP server
	port := getEnv("PORT", "8085")
	server := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	// Handle graceful shutdown
	go func() {
		sigint := make(chan os.Signal, 1)
		signal.Notify(sigint, os.Interrupt, syscall.SIGTERM)
		<-sigint

		log.Println("Shutting down server...")
		cancel() // Cancel Kafka consumer context

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Printf("Server shutdown error: %v", err)
		}
	}()

	log.Printf("Summary Service starting on port %s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed to start: %v", err)
	}

	log.Println("Server stopped")
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
