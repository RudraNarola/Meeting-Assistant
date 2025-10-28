.PHONY: help build run stop clean test deps docker-build docker-up docker-down logs

help: ## Show this help
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

deps: ## Download Go dependencies
	go mod download
	go mod tidy

build: ## Build all services
	@echo "Building all services..."
	go build -o bin/api-gateway ./services/api-gateway/cmd
	go build -o bin/audio-service ./services/audio-service/cmd
	go build -o bin/transcription-service ./services/transcription-service/cmd
	go build -o bin/diarization-service ./services/diarization-service/cmd

docker-build: ## Build Docker images
	docker-compose build

docker-up: ## Start all services with Docker Compose
	docker-compose up -d

docker-down: ## Stop all services
	docker-compose down

docker-logs: ## Show logs from all services
	docker-compose logs -f

clean: ## Clean build artifacts
	rm -rf bin/
	rm -rf storage/
	docker-compose down -v

test: ## Run tests
	go test -v ./...

run-gateway: ## Run API Gateway locally
	go run ./services/api-gateway/cmd/main.go

run-audio: ## Run Audio Service locally
	go run ./services/audio-service/cmd/main.go

run-transcription: ## Run Transcription Service locally
	go run ./services/transcription-service/cmd/main.go

run-diarization: ## Run Diarization Service locally
	go run ./services/diarization-service/cmd/main.go

setup: ## Initial setup
	cp .env.example .env
	mkdir -p storage
	@echo "Setup complete! Edit .env file with your configuration."
