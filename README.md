# Meeting Transcript Generator

A complete microservices-based application built in Go for generating meeting transcripts with speaker identification from Google Meet and Zoom recordings.

## 🌟 Features

- **Audio Upload & Processing**: Upload meeting recordings from Google Meet or Zoom
- **🎙️ Real AI Transcription**: Uses OpenAI's Whisper for accurate speech-to-text (no API keys needed!)
- **Speaker Diarization**: Identify and tag different speakers in the conversation
- **90+ Languages Supported**: Automatic language detection and transcription
- **Speaker Management**: Assign names to identified speakers
- **RESTful API**: Clean API interface for all operations
- **Microservices Architecture**: Scalable and maintainable service design
- **Message Queue Processing**: Asynchronous processing using RabbitMQ
- **Caching**: Redis-based caching for improved performance
- **Docker Support**: Fully containerized application
- **Offline Capable**: Runs completely locally without external API dependencies

## 🏗️ Architecture

The application consists of 5 main microservices:

### 1. API Gateway (Port 8080)

- Entry point for all client requests
- Routes requests to appropriate microservices
- Implements caching for improved performance
- Handles request/response transformation

### 2. Audio Service (Port 8081)

- Handles audio file uploads
- Stores audio files in persistent storage
- Manages meeting metadata
- Publishes messages to transcription queue

### 3. Transcription Service (Port 8082)

- Consumes audio processing messages
- Calls Whisper service for real transcription
- Stores transcription results
- Publishes to diarization queue

### 4. Whisper Service (Port 8084) 🎙️ NEW!

- **Real AI-powered transcription** using OpenAI's Whisper
- Supports 90+ languages with automatic detection
- Multiple model sizes (tiny, base, small, medium, large)
- Runs locally - no API keys required
- Returns timestamped segments with confidence scores

### 5. Diarization Service (Port 8083)

- Performs speaker identification
- Segments transcript by speaker
- Manages speaker metadata
- Allows updating speaker names

### Supporting Services

- **PostgreSQL**: Stores all meeting, transcription, and speaker data
- **RabbitMQ**: Message queue for asynchronous processing
- **Redis**: Caching layer for improved performance

## 📋 Prerequisites

- Docker and Docker Compose
- Go 1.21+ (for local development)
- Make (optional, for using Makefile commands)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
cd MAP_transcipt_generate

# Copy environment file
cp .env.example .env

# Edit .env with your API keys if using real transcription services
```

### 2. Start with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# Or using Make
make docker-up
```

This will start:

- API Gateway on http://localhost:8080
- Audio Service on http://localhost:8081
- Transcription Service on http://localhost:8082
- Diarization Service on http://localhost:8083
- PostgreSQL on localhost:5432
- RabbitMQ on http://localhost:15672 (username: admin, password: admin123)
- Redis on localhost:6379

### 3. Check Service Health

```bash
# Check API Gateway
curl http://localhost:8080/health

# Check individual services
curl http://localhost:8081/health
curl http://localhost:8082/health
curl http://localhost:8083/health
```

## 📖 API Documentation

### Base URL

```
http://localhost:8080/api/v1
```

### Endpoints

#### 1. Upload Audio File

```bash
POST /api/v1/meetings/upload

# Example using curl
curl -X POST http://localhost:8080/api/v1/meetings/upload \
  -F "audio=@/path/to/meeting.mp3" \
  -F "title=Team Standup Meeting" \
  -F "platform=google_meet"
```

**Request:**

- `audio` (file): Audio file (mp3, wav, m4a, etc.)
- `title` (string): Meeting title
- `platform` (string): "google_meet" or "zoom"

**Response:**

```json
{
  "message": "Audio uploaded successfully",
  "data": {
    "meeting_id": "uuid",
    "audio_file": {
      "id": "uuid",
      "filename": "meeting.mp3",
      "file_size": 12345678,
      "uploaded_at": "2025-10-28T10:00:00Z"
    }
  }
}
```

#### 2. Get Meeting Status

```bash
GET /api/v1/meetings/{meetingID}/status

# Example
curl http://localhost:8080/api/v1/meetings/{meeting-id}/status
```

**Response:**

```json
{
  "meeting_id": "uuid",
  "status": "completed",
  "title": "Team Standup Meeting",
  "platform": "google_meet",
  "created_at": "2025-10-28T10:00:00Z",
  "updated_at": "2025-10-28T10:05:00Z"
}
```

**Status Values:**

- `pending`: Meeting created, waiting for processing
- `processing`: Audio being transcribed and analyzed
- `completed`: Processing complete
- `failed`: Processing failed

#### 3. Get Full Transcript

```bash
GET /api/v1/meetings/{meetingID}/transcript

# Example
curl http://localhost:8080/api/v1/meetings/{meeting-id}/transcript
```

**Response:**

```json
{
  "meeting": {
    "id": "uuid",
    "title": "Team Standup Meeting",
    "platform": "google_meet",
    "status": "completed"
  },
  "speakers": [
    {
      "id": "uuid",
      "label": "Speaker 1",
      "name": "John Doe"
    },
    {
      "id": "uuid",
      "label": "Speaker 2",
      "name": "Jane Smith"
    }
  ],
  "segments": [
    {
      "id": "uuid",
      "speaker_id": "uuid",
      "speaker_name": "John Doe",
      "text": "Hello everyone, thank you for joining today's meeting.",
      "start_time": 0.0,
      "end_time": 4.5,
      "confidence": 0.95,
      "sequence_number": 1
    }
  ],
  "full_text": "Complete transcript...",
  "duration": 1800.5,
  "created_at": "2025-10-28T10:00:00Z"
}
```

#### 4. Get Speakers

```bash
GET /api/v1/meetings/{meetingID}/speakers

# Example
curl http://localhost:8080/api/v1/meetings/{meeting-id}/speakers
```

**Response:**

```json
{
  "meeting_id": "uuid",
  "speakers": [
    {
      "id": "uuid",
      "meeting_id": "uuid",
      "name": "",
      "label": "Speaker 1",
      "created_at": "2025-10-28T10:00:00Z"
    }
  ]
}
```

#### 5. Update Speaker Name

```bash
PUT /api/v1/speakers/{speakerID}

# Example
curl -X PUT http://localhost:8080/api/v1/speakers/{speaker-id} \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe"}'
```

**Request:**

```json
{
  "name": "John Doe"
}
```

**Response:**

```json
{
  "message": "Speaker updated successfully",
  "data": {
    "id": "uuid",
    "meeting_id": "uuid",
    "name": "John Doe",
    "label": "Speaker 1"
  }
}
```

## 🔧 Development

### Local Development Setup

#### 1. Start Infrastructure Services

```bash
# Start only PostgreSQL, RabbitMQ, and Redis
docker-compose up -d postgres rabbitmq redis
```

#### 2. Install Dependencies

```bash
go mod download
```

#### 3. Run Services Locally

Open 4 terminal windows:

```bash
# Terminal 1 - Audio Service
make run-audio

# Terminal 2 - Transcription Service
make run-transcription

# Terminal 3 - Diarization Service
make run-diarization

# Terminal 4 - API Gateway
make run-gateway
```

### Project Structure

```
MAP_transcipt_generate/
├── docker-compose.yml          # Docker orchestration
├── go.mod                      # Go dependencies
├── Makefile                    # Build and run commands
├── .env.example               # Environment variables template
├── scripts/
│   └── init-db.sql           # Database initialization
├── pkg/                      # Shared packages
│   ├── models/              # Data models
│   ├── database/            # Database utilities
│   ├── queue/               # Message queue utilities
│   └── utils/               # Common utilities
└── services/
    ├── api-gateway/         # API Gateway service
    │   ├── cmd/
    │   │   └── main.go
    │   ├── internal/
    │   │   ├── handlers/
    │   │   └── proxy/
    │   └── Dockerfile
    ├── audio-service/       # Audio processing service
    │   ├── cmd/
    │   │   └── main.go
    │   ├── internal/
    │   │   ├── handlers/
    │   │   ├── repository/
    │   │   └── service/
    │   └── Dockerfile
    ├── transcription-service/ # Transcription service
    │   ├── cmd/
    │   │   └── main.go
    │   ├── internal/
    │   │   ├── handlers/
    │   │   ├── repository/
    │   │   └── service/
    │   └── Dockerfile
    └── diarization-service/   # Speaker diarization service
        ├── cmd/
        │   └── main.go
        ├── internal/
        │   ├── handlers/
        │   ├── repository/
        │   └── service/
        └── Dockerfile
```

## 🧪 Testing

### Manual Testing with Sample Audio

```bash
# Upload a sample audio file
curl -X POST http://localhost:8080/api/v1/meetings/upload \
  -F "audio=@sample-meeting.mp3" \
  -F "title=Test Meeting" \
  -F "platform=zoom"

# Save the meeting_id from the response

# Check status (wait a few seconds for processing)
curl http://localhost:8080/api/v1/meetings/{meeting_id}/status

# Get full transcript
curl http://localhost:8080/api/v1/meetings/{meeting_id}/transcript

# Update speaker names
curl -X PUT http://localhost:8080/api/v1/speakers/{speaker_id} \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Johnson"}'
```

## 🔌 Integration with Real Speech-to-Text Services

The current implementation uses mock transcription and diarization. To integrate with real services:

### Google Cloud Speech-to-Text

1. Install Google Cloud SDK and authenticate
2. Update `transcription-service/internal/service/service.go`:

```go
import (
    speech "cloud.google.com/go/speech/apiv1"
    "cloud.google.com/go/speech/apiv1/speechpb"
)

// In transcribeAudio function
ctx := context.Background()
client, err := speech.NewClient(ctx)
// Use client for transcription
```

### Azure Cognitive Services

1. Get Azure Speech API key
2. Update environment variables
3. Integrate Azure SDK in transcription service

### AWS Transcribe

1. Configure AWS credentials
2. Use AWS SDK for Go
3. Implement transcription with Amazon Transcribe

## 📊 Monitoring

### RabbitMQ Management

Access at: http://localhost:15672

- Username: `admin`
- Password: `admin123`

Monitor queue messages and consumer status.

### View Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f api-gateway
docker-compose logs -f transcription-service
```

## 🛠️ Useful Commands

```bash
# Build all services
make build

# Build Docker images
make docker-build

# Start services
make docker-up

# Stop services
make docker-down

# View logs
make docker-logs

# Clean everything
make clean

# Run tests
make test
```

## 🐛 Troubleshooting

### Services won't start

```bash
# Check if ports are available
lsof -i :8080
lsof -i :5432

# Restart services
docker-compose down
docker-compose up -d
```

### Database connection issues

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Recreate database
docker-compose down -v
docker-compose up -d
```

### Message queue issues

```bash
# Check RabbitMQ logs
docker-compose logs rabbitmq

# Access management UI
open http://localhost:15672
```

## 🚀 Production Deployment

For production deployment:

1. **Security**: Update all default passwords in `.env`
2. **Storage**: Use cloud storage (S3, GCS) instead of local filesystem
3. **Database**: Use managed PostgreSQL service
4. **Queue**: Use managed RabbitMQ or Amazon SQS
5. **API Keys**: Add authentication and authorization
6. **Monitoring**: Add Prometheus and Grafana
7. **Logging**: Implement centralized logging
8. **Load Balancing**: Add load balancer for API Gateway

## 📝 License

MIT License

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue in the repository.

---

**Note**: This application currently uses mock transcription and speaker diarization for demonstration purposes. For production use, integrate with actual speech-to-text and speaker identification services like Google Cloud Speech-to-Text, Azure Cognitive Services, or AWS Transcribe.
