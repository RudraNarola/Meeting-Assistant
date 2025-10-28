# Summary Service Quick Start

## 🚀 Quick Test

Run the automated test script:

```bash
./test_summary.sh
```

This will:

1. Upload an audio/video file
2. Wait for transcription and diarization
3. Verify Kafka message publishing
4. Check summary generation
5. Display results from MongoDB
6. Show all available API endpoints

## 📋 Manual Testing Steps

### 1. Upload Audio/Video

```bash
curl -X POST http://localhost:8080/api/v1/audio/upload \
  -F "audio=@meeting_audio.mp3" \
  -F "title=Team Meeting" \
  -F "platform=google-meet"
```

**Response**: Save the `meeting_id` from response

### 2. Get Transcript (after ~1-2 minutes)

```bash
curl http://localhost:8080/api/v1/meetings/{meeting_id}/transcript
```

### 3. Get Summary (after ~30 seconds from transcript completion)

```bash
curl http://localhost:8080/api/v1/meetings/{meeting_id}/summary
```

### 4. Get All Summaries

```bash
curl http://localhost:8080/api/v1/summaries
```

### 5. Delete Summary

```bash
curl -X DELETE http://localhost:8080/api/v1/summaries/{summary_id}
```

## 🔍 Monitoring

### Watch Summary Service Logs

```bash
docker logs -f transcript-summary-service
```

### Watch Kafka Messages

```bash
docker exec -it transcript-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic transcript-completed \
  --from-beginning
```

### Check MongoDB Data

```bash
docker exec -it transcript-mongodb mongosh transcript_db
> db.summaries.find().pretty()
```

### Monitor All Services

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

## 🛠️ Troubleshooting

### Summary Not Generated?

1. **Check Kafka logs**:

```bash
docker logs transcript-diarization-service | grep -i kafka
docker logs transcript-summary-service | grep -i consumed
```

2. **Verify Kafka topic**:

```bash
docker exec transcript-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

3. **Check MongoDB**:

```bash
docker exec transcript-mongodb mongosh transcript_db --eval "db.summaries.countDocuments()"
```

### Service Not Responding?

1. **Restart summary service**:

```bash
docker restart transcript-summary-service
```

2. **Check all services**:

```bash
docker compose ps
```

3. **Rebuild if needed**:

```bash
docker compose down
docker compose build summary-service --no-cache
docker compose up -d
```

## 📊 Architecture Overview

```
┌─────────────┐
│  Upload     │
│ Audio/Video │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   FFmpeg    │
│   Extract   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Whisper   │
│Transcription│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Diarization │
│   Service   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│   Kafka     │────▶│   Summary   │
│   Topic     │     │   Service   │
└─────────────┘     └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   MongoDB   │
                    │  (Storage)  │
                    └─────────────┘
```

## 🔑 Key Features

- ✅ **Event-Driven**: Uses Kafka for asynchronous processing
- ✅ **Automatic**: Summaries generated automatically after transcription
- ✅ **AI-Powered**: Extractive summarization (upgradeable to GPT)
- ✅ **RESTful API**: Easy integration with any client
- ✅ **Scalable**: Kafka consumer groups for horizontal scaling
- ✅ **Cached**: Redis caching for better performance

## 📝 API Endpoints

| Method | Endpoint                 | Description          |
| ------ | ------------------------ | -------------------- |
| GET    | `/summaries`             | Get all summaries    |
| GET    | `/summaries/{id}`        | Get specific summary |
| GET    | `/meetings/{id}/summary` | Get meeting summary  |
| DELETE | `/summaries/{id}`        | Delete summary       |

## 🔧 Configuration

### Environment Variables

- `PORT`: 8085
- `MONGODB_URI`: mongodb://mongodb:27017
- `KAFKA_BROKERS`: kafka:9092
- `KAFKA_TOPIC`: transcript-completed
- `KAFKA_GROUP_ID`: summary-service-group

### Service URLs

- API Gateway: http://localhost:8080
- Summary Service: http://localhost:8085
- MongoDB: mongodb://localhost:27017
- Kafka: localhost:9092

## 📚 Documentation

For detailed documentation, see:

- [SUMMARY_SERVICE.md](SUMMARY_SERVICE.md) - Complete documentation
- [QUICKSTART.md](QUICKSTART.md) - General project setup
- [API_EXAMPLES.md](docs/API_EXAMPLES.md) - API usage examples

## 🎯 Next Steps

1. **Test the workflow**: Run `./test_summary.sh`
2. **Try the APIs**: Use the curl commands above
3. **Monitor services**: Watch logs and metrics
4. **Customize**: Modify summarization algorithm
5. **Upgrade**: Integrate OpenAI GPT for better summaries

## 💡 Tips

- First transcription takes longer (~1-2 minutes)
- Summary generation is quick (~10-30 seconds)
- Use `jq` for prettier JSON output: `curl ... | jq '.'`
- Check logs if anything doesn't work as expected
- MongoDB persists data even after container restart

## 🚨 Common Issues

### "Summary not found"

- Wait a bit longer, summary generation is asynchronous
- Check if transcript was completed successfully
- Verify Kafka consumer is running

### "Service unavailable"

- Ensure all containers are running: `docker compose ps`
- Check service logs: `docker logs transcript-summary-service`
- Restart if needed: `docker restart transcript-summary-service`

### "Kafka connection refused"

- Kafka takes ~30 seconds to start
- Verify Kafka is healthy: `docker ps | grep kafka`
- Check Zookeeper is running

---

**Happy Testing! 🎉**

For questions or issues, check the detailed documentation in `SUMMARY_SERVICE.md`.
