# Testing Guide - Kafka Summary Pipeline with MongoDB

## 🚀 Step-by-Step Testing Instructions

### Step 1: Start All Services
```powershell
cd d:\MAP\Assignment\kafka_summary_pipeline
docker-compose down
docker-compose up -d --build
```

Wait 20-30 seconds for all services to start.

### Step 2: Check Services Status
```powershell
docker-compose ps
```

You should see:
- ✅ zookeeper (running)
- ✅ kafka (healthy)
- ✅ mongodb (running)
- ✅ kafka-consumer (running)
- ✅ summary-api (running)

### Step 3: Check Consumer is Listening
```powershell
docker logs kafka-consumer
```

You should see:
```
🔌 Connecting to MongoDB at mongodb://admin:admin123@mongodb:27017/
✅ Connected to MongoDB database: meeting_summaries
🟣 Kafka Consumer started. Waiting for messages...
```

### Step 4: Send Transcripts (Run Producer Once)
```powershell
docker run --rm --network kafka_summary_pipeline_kafka-network -v ${PWD}:/app -w /app -e KAFKA_BROKER=kafka:9092 -e KAFKA_TOPIC=transcripts python:3.11-slim bash -c "pip install kafka-python -q && python producer/producer_once.py"
```

You should see:
```
🟢 Kafka Producer started. Sending transcripts...
📤 Sent: Team Sync - Product Updates
📤 Sent: Client Meeting - ABC Corp
✅ All transcripts sent! Producer finished.
```

### Step 5: Verify Consumer Processed Messages
```powershell
docker logs kafka-consumer --tail=50
```

You should see:
```
📩 Received new transcript: Team Sync - Product Updates
🧠 Summarizing: Team Sync - Product Updates
✅ Summary saved to MongoDB with ID: <some_id>
📊 Database: meeting_summaries, Collection: summaries
```

---

## 📮 Postman API Testing

### Base URL
```
http://localhost:8000
```

### Endpoint 1: Health Check
**GET** `http://localhost:8000/`

**Expected Response:**
```json
{
  "message": "Meeting Summary API is running",
  "version": "1.0",
  "database": "meeting_summaries",
  "endpoints": {
    "get_all": "/summaries",
    "get_one": "/summaries/{id}",
    "delete": "/summaries/{id}"
  }
}
```

---

### Endpoint 2: Get All Summaries
**GET** `http://localhost:8000/summaries`

**Expected Response:**
```json
{
  "total": 2,
  "summaries": [
    {
      "id": "6901093c747668df6a97ea57",
      "title": "Client Meeting - ABC Corp",
      "content": "The client requested a dashboard...",
      "summary": "## Meeting Summary\n- Overview: ...",
      "timestamp": "2025-10-28T18:19:40.139000",
      "created_at": "2025-10-28T18:19:40.139000"
    },
    {
      "id": "6901093b747668df6a97ea56",
      "title": "Team Sync - Product Updates",
      "content": "We discussed the new feature...",
      "summary": "## Meeting Summary\n- Overview: ...",
      "timestamp": "2025-10-28T18:19:39.132000",
      "created_at": "2025-10-28T18:19:39.132000"
    }
  ]
}
```

---

### Endpoint 3: Get Specific Summary by ID
**GET** `http://localhost:8000/summaries/{id}`

**Example:**
```
GET http://localhost:8000/summaries/6901093c747668df6a97ea57
```

**Expected Response:**
```json
{
  "id": "6901093c747668df6a97ea57",
  "title": "Client Meeting - ABC Corp",
  "content": "The client requested a dashboard redesign...",
  "summary": "## Meeting Summary\n- Overview: The ABC Corp client...",
  "timestamp": "2025-10-28T18:19:40.139000",
  "created_at": "2025-10-28T18:19:40.139000"
}
```

**Error Response (Invalid ID):**
```json
{
  "detail": "Invalid ID format"
}
```

**Error Response (Not Found):**
```json
{
  "detail": "Summary not found"
}
```

---

### Endpoint 4: Delete Summary by ID
**DELETE** `http://localhost:8000/summaries/{id}`

**Example:**
```
DELETE http://localhost:8000/summaries/6901093c747668df6a97ea57
```

**Expected Response:**
```json
{
  "message": "Summary deleted successfully",
  "id": "6901093c747668df6a97ea57"
}
```

**Error Response (Not Found):**
```json
{
  "detail": "Summary not found"
}
```

---

### Endpoint 5: Get Statistics
**GET** `http://localhost:8000/stats`

**Expected Response:**
```json
{
  "total_summaries": 2,
  "database": "meeting_summaries",
  "collection": "summaries"
}
```

---

## 🔍 Postman Collection Steps

1. **Open Postman**
2. **Create New Collection** named "Meeting Summary API"
3. **Add these requests:**

   a. **Health Check**
      - Method: GET
      - URL: `http://localhost:8000/`

   b. **Get All Summaries**
      - Method: GET
      - URL: `http://localhost:8000/summaries`

   c. **Get Specific Summary**
      - Method: GET
      - URL: `http://localhost:8000/summaries/{{summary_id}}`
      - (Copy an ID from "Get All Summaries" response)

   d. **Delete Summary**
      - Method: DELETE
      - URL: `http://localhost:8000/summaries/{{summary_id}}`

   e. **Get Stats**
      - Method: GET
      - URL: `http://localhost:8000/stats`

---

## 📊 Complete Testing Flow

1. ✅ Start all services
2. ✅ Check consumer is listening
3. ✅ Run producer to send transcripts
4. ✅ Verify consumer saved to MongoDB
5. ✅ Test GET `/summaries` in Postman (see all summaries)
6. ✅ Copy an ID from the response
7. ✅ Test GET `/summaries/{id}` in Postman (see specific summary)
8. ✅ Test DELETE `/summaries/{id}` in Postman (delete summary)
9. ✅ Test GET `/summaries` again to confirm deletion
10. ✅ Test GET `/stats` to see count

---

## 🛑 Stop Services
```powershell
docker-compose down
```

To remove MongoDB data as well:
```powershell
docker-compose down -v
```

---

## 🎯 Quick Commands Reference

**Start everything:**
```powershell
docker-compose up -d --build
```

**Send transcripts:**
```powershell
docker run --rm --network kafka_summary_pipeline_kafka-network -v ${PWD}:/app -w /app -e KAFKA_BROKER=kafka:9092 -e KAFKA_TOPIC=transcripts python:3.11-slim bash -c "pip install kafka-python -q && python producer/producer_once.py"
```

**View consumer logs:**
```powershell
docker logs -f kafka-consumer
```

**View API logs:**
```powershell
docker logs -f summary-api
```

**Check API is running:**
```powershell
curl http://localhost:8000/
```

Or open in browser: `http://localhost:8000/docs` (Interactive API docs)
