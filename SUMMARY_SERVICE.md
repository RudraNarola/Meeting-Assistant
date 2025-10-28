# Summary Service Documentation

## Overview

The Summary Service is an AI-powered microservice that automatically generates summaries from meeting transcripts using event-driven architecture with Apache Kafka.

## Architecture

### Complete Workflow

```
Video/Audio Upload → Audio Extraction → Transcription → Diarization → Kafka → Summary Generation → MongoDB
```

#### Step-by-Step Flow:

1. **Upload**: User uploads video or audio file
2. **Audio Extraction**: For videos, FFmpeg extracts audio (16kHz, mono, WAV)
3. **Transcription**: Whisper service transcribes audio to text
4. **Diarization**: Service identifies speakers and segments
5. **Kafka Publishing**: Diarization service publishes completed transcript to Kafka topic `transcript-completed`
6. **Summary Generation**: Summary service consumes from Kafka and generates AI summary
7. **Storage**: Summary stored in MongoDB with meeting metadata
8. **API Access**: Users can retrieve summaries via REST APIs

### Technology Stack

- **Language**: Go 1.21
- **Message Broker**: Apache Kafka 7.5.0 + Zookeeper
- **Database**: MongoDB 7.0
- **Libraries**:
  - `segmentio/kafka-go` v0.4.47 - Kafka client
  - `mongo-driver` v1.13.1 - MongoDB driver

## Service Components

### 1. Kafka Producer (Diarization Service)

**Location**: `services/diarization-service/internal/service/service.go`

**Function**: Publishes completed transcripts to Kafka after speaker diarization

**Message Format**:

```json
{
  "meeting_id": "uuid-string",
  "title": "Meeting Title",
  "platform": "google-meet",
  "transcript": "Full transcript with speaker labels...",
  "speakers": [
    {
      "id": "speaker-uuid",
      "meeting_id": "meeting-uuid",
      "speaker_label": "SPEAKER_00",
      "name": "John Doe"
    }
  ],
  "segments": [
    {
      "speaker_id": "speaker-uuid",
      "text": "Hello everyone",
      "start_time": 0.0,
      "end_time": 2.5,
      "confidence": 0.95
    }
  ]
}
```

### 2. Summary Service

#### Internal Structure

```
services/summary-service/
├── cmd/main.go                    # Service initialization
├── internal/
│   ├── handlers/handlers.go      # HTTP endpoints
│   ├── repository/repository.go  # MongoDB operations
│   └── service/service.go        # Kafka consumer & AI logic
├── Dockerfile
└── README.md
```

#### Key Components:

##### A. Repository Layer (`repository.go`)

**Purpose**: MongoDB CRUD operations

**Methods**:

- `CreateSummary(summary *models.Summary)` - Insert new summary
- `GetAllSummaries()` - Retrieve all summaries
- `GetSummaryByID(id string)` - Get specific summary
- `GetSummaryByMeetingID(meetingID string)` - Get summary for a meeting
- `UpdateSummary(id string, summary *models.Summary)` - Update existing summary
- `DeleteSummary(id string)` - Delete summary

**Collection**: `summaries`

##### B. Service Layer (`service.go`)

**Purpose**: Kafka consumer and AI summarization

**Key Functions**:

1. **ConsumeTranscripts()**:

   - Consumes messages from `transcript-completed` Kafka topic
   - Consumer group: `summary-service-group`
   - Auto-creates summaries on new transcript messages

2. **generateSummary(transcript string)**:
   - AI-powered extractive summarization
   - Algorithm: Sentence scoring based on word frequency
   - Returns top 3-5 most important sentences
   - Can be replaced with OpenAI API for better results

##### C. Handler Layer (`handlers.go`)

**Purpose**: REST API endpoints

**Endpoints**:

- `GET /summaries` - Get all summaries
- `GET /summaries/{summaryID}` - Get specific summary
- `GET /meetings/{meetingID}/summary` - Get summary for a meeting
- `DELETE /summaries/{summaryID}` - Delete summary

### 3. API Gateway Integration

**Location**: `services/api-gateway/`

**Routes Added**:

```go
r.Get("/summaries", handler.GetAllSummaries)
r.Get("/summaries/{summaryID}", handler.GetSummaryByID)
r.Get("/meetings/{meetingID}/summary", handler.GetSummaryByMeetingID)
r.Delete("/summaries/{summaryID}", handler.DeleteSummary)
```

**Proxy Configuration**:

- Service URL: `http://summary-service:8085`
- Cache TTL: 15 minutes
- Cache keys: `summary:{id}`, `summary:meeting:{meetingID}`

## Data Models

### Summary Model

```go
type Summary struct {
    ID          string    `json:"id" bson:"_id"`
    MeetingID   string    `json:"meeting_id" bson:"meeting_id"`
    Summary     string    `json:"summary" bson:"summary"`
    GeneratedAt time.Time `json:"generated_at" bson:"generated_at"`
    UpdatedAt   time.Time `json:"updated_at" bson:"updated_at"`
}
```

### MongoDB Schema

```javascript
{
  "_id": "uuid-string",
  "meeting_id": "meeting-uuid",
  "summary": "This is the AI-generated summary of the meeting...",
  "generated_at": ISODate("2025-10-28T18:00:00Z"),
  "updated_at": ISODate("2025-10-28T18:00:00Z")
}
```

## API Documentation

### Base URL

```
http://localhost:8080/api/v1
```

### Endpoints

#### 1. Get All Summaries

**Request**:

```bash
curl http://localhost:8080/api/v1/summaries
```

**Response**:

```json
{
  "summaries": [
    {
      "id": "summary-uuid-1",
      "meeting_id": "meeting-uuid-1",
      "summary": "Meeting summary text...",
      "generated_at": "2025-10-28T18:00:00Z",
      "updated_at": "2025-10-28T18:00:00Z"
    }
  ]
}
```

#### 2. Get Summary by ID

**Request**:

```bash
curl http://localhost:8080/api/v1/summaries/{summaryID}
```

**Response**:

```json
{
  "id": "summary-uuid",
  "meeting_id": "meeting-uuid",
  "summary": "Meeting summary text...",
  "generated_at": "2025-10-28T18:00:00Z",
  "updated_at": "2025-10-28T18:00:00Z"
}
```

#### 3. Get Summary by Meeting ID

**Request**:

```bash
curl http://localhost:8080/api/v1/meetings/{meetingID}/summary
```

**Response**:

```json
{
  "id": "summary-uuid",
  "meeting_id": "meeting-uuid",
  "summary": "Meeting summary text...",
  "generated_at": "2025-10-28T18:00:00Z",
  "updated_at": "2025-10-28T18:00:00Z"
}
```

#### 4. Delete Summary

**Request**:

```bash
curl -X DELETE http://localhost:8080/api/v1/summaries/{summaryID}
```

**Response**:

```json
{
  "message": "Summary deleted successfully"
}
```

## Configuration

### Environment Variables

#### Summary Service

- `PORT`: Service port (default: 8085)
- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DATABASE`: Database name (default: transcript_db)
- `KAFKA_BROKERS`: Kafka broker addresses (default: kafka:9092)
- `KAFKA_TOPIC`: Topic to consume from (default: transcript-completed)
- `KAFKA_GROUP_ID`: Consumer group ID (default: summary-service-group)

#### Docker Compose Configuration

```yaml
summary-service:
  build:
    context: .
    dockerfile: services/summary-service/Dockerfile
  ports:
    - "8085:8085"
  environment:
    - PORT=8085
    - MONGODB_URI=mongodb://mongodb:27017
    - MONGODB_DATABASE=transcript_db
    - KAFKA_BROKERS=kafka:9092
    - KAFKA_TOPIC=transcript-completed
    - KAFKA_GROUP_ID=summary-service-group
  depends_on:
    kafka:
      condition: service_healthy
    mongodb:
      condition: service_healthy
```

## Kafka Configuration

### Topic: `transcript-completed`

**Partitions**: 1 (default)
**Replication Factor**: 1
**Consumer Group**: `summary-service-group`
**Auto Offset Reset**: `earliest` (processes all messages from beginning)
**Commit Interval**: 1 second

### Message Flow

1. Diarization service completes speaker identification
2. Publishes JSON message to `transcript-completed` topic
3. Summary service consumes message asynchronously
4. Generates AI summary from transcript text
5. Stores summary in MongoDB
6. Summary available via REST APIs

## MongoDB Configuration

### Database: `transcript_db`

### Collection: `summaries`

**Indexes**:

- `_id` (unique)
- `meeting_id` (unique) - One summary per meeting

**Connection**:

```go
mongodb://mongodb:27017
```

**Connection Pool**:

- Max Pool Size: 10
- Min Pool Size: 5
- Max Idle Time: 5 minutes

## Testing

### Complete Workflow Test

1. **Upload Video/Audio**:

```bash
curl -X POST http://localhost:8080/api/v1/audio/upload \
  -F "audio=@meeting_audio.mp3" \
  -F "title=Team Meeting" \
  -F "platform=google-meet"
```

2. **Wait for Processing** (check logs):

```bash
docker logs -f transcript-diarization-service
docker logs -f transcript-summary-service
```

3. **Get Meeting ID** from upload response:

```json
{
  "audio_file": {
    "meeting_id": "abc-123-xyz"
  }
}
```

4. **Check Summary**:

```bash
curl http://localhost:8080/api/v1/meetings/abc-123-xyz/summary
```

### Verify Kafka Messages

```bash
# Enter Kafka container
docker exec -it transcript-kafka bash

# List topics
kafka-topics --bootstrap-server localhost:9092 --list

# Read messages from topic
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic transcript-completed \
  --from-beginning
```

### Verify MongoDB Data

```bash
# Enter MongoDB container
docker exec -it transcript-mongodb mongosh

# Use database
use transcript_db

# List summaries
db.summaries.find().pretty()
```

## AI Summarization

### Current Implementation: Extractive Summarization

**Algorithm**:

1. Split transcript into sentences
2. Tokenize and remove stop words
3. Calculate word frequency
4. Score sentences based on word importance
5. Select top N sentences (3-5)
6. Return as summary

**Pros**:

- Fast and lightweight
- No external API dependencies
- Works offline

**Cons**:

- Less sophisticated than AI models
- May miss context and nuances
- Limited to extracting existing sentences

### Upgrading to OpenAI API

To use OpenAI's GPT for better summaries:

1. **Add OpenAI SDK**:

```bash
go get github.com/sashabaranov/go-openai
```

2. **Update `generateSummary()` in `service.go`**:

```go
import "github.com/sashabaranov/go-openai"

func (s *SummaryService) generateSummary(transcript string) string {
    client := openai.NewClient(os.Getenv("OPENAI_API_KEY"))

    resp, err := client.CreateChatCompletion(
        context.Background(),
        openai.ChatCompletionRequest{
            Model: openai.GPT4,
            Messages: []openai.ChatCompletionMessage{
                {
                    Role: "system",
                    Content: "You are a helpful assistant that summarizes meeting transcripts.",
                },
                {
                    Role: "user",
                    Content: fmt.Sprintf("Summarize this transcript in 3-5 key points:\n\n%s", transcript),
                },
            },
        },
    )

    if err != nil {
        log.Printf("OpenAI API error: %v", err)
        return s.fallbackSummarization(transcript)
    }

    return resp.Choices[0].Message.Content
}
```

3. **Add Environment Variable**:

```yaml
environment:
  - OPENAI_API_KEY=sk-your-api-key
```

## Monitoring

### Health Checks

```bash
# Summary Service
curl http://localhost:8085/health

# API Gateway
curl http://localhost:8080/health
```

### Service Logs

```bash
# Summary service
docker logs -f transcript-summary-service

# Kafka messages
docker logs -f transcript-kafka

# MongoDB operations
docker logs -f transcript-mongodb
```

### Metrics to Monitor

- Kafka consumer lag
- Message processing time
- MongoDB query performance
- API response times
- Error rates

## Troubleshooting

### Summary Not Generated

1. **Check Kafka connection**:

```bash
docker logs transcript-summary-service | grep "Kafka"
```

2. **Verify topic exists**:

```bash
docker exec transcript-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

3. **Check consumer group**:

```bash
docker exec transcript-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group summary-service-group --describe
```

### MongoDB Connection Issues

1. **Check MongoDB health**:

```bash
docker exec transcript-mongodb mongosh --eval "db.adminCommand('ping')"
```

2. **Verify connection string**:

```bash
docker logs transcript-summary-service | grep "MongoDB"
```

### API Not Responding

1. **Check service status**:

```bash
docker ps | grep summary-service
```

2. **Verify API Gateway routing**:

```bash
docker logs transcript-api-gateway | grep "Summary Service"
```

3. **Test direct service access**:

```bash
curl http://localhost:8085/summaries
```

## Performance Optimization

### Kafka Consumer

- Increase `MaxBytes` for larger messages
- Adjust `CommitInterval` for better throughput
- Scale consumers by increasing replicas

### MongoDB

- Add indexes on frequently queried fields
- Use connection pooling
- Implement caching for read-heavy workloads

### Summary Generation

- Cache generated summaries
- Use background workers for heavy processing
- Implement batch processing for multiple transcripts

## Future Enhancements

1. **Advanced AI Models**:

   - Integration with OpenAI GPT-4
   - Fine-tuned models for meeting summaries
   - Multi-language support

2. **Features**:

   - Action items extraction
   - Key topics identification
   - Sentiment analysis
   - Meeting highlights

3. **Scalability**:

   - Horizontal scaling with multiple consumers
   - Distributed caching with Redis
   - Message batching for better throughput

4. **Analytics**:
   - Summary quality metrics
   - User engagement tracking
   - Performance monitoring dashboard

## Security Considerations

1. **Authentication**: Add JWT-based authentication
2. **Authorization**: Implement role-based access control
3. **Encryption**: Use TLS for Kafka and MongoDB connections
4. **API Rate Limiting**: Prevent abuse
5. **Data Privacy**: Encrypt sensitive meeting content

## Conclusion

The Summary Service provides automated, event-driven summarization of meeting transcripts using Kafka and MongoDB. It integrates seamlessly with the existing microservices architecture and provides RESTful APIs for summary management.

For questions or issues, refer to the troubleshooting section or check service logs.
