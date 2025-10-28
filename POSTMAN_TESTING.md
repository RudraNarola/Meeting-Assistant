# 🚀 QUICK START GUIDE - Testing with Postman

## ✅ All Services Are Running!

Services:
- ✅ Zookeeper (port 2181)
- ✅ Kafka (port 9092)
- ✅ MongoDB (port 27017)
- ✅ Consumer (listening for messages)
- ✅ API Server (port 8000)

---

## 📝 STEP 1: Verify Consumer is Listening

Run this command:
```powershell
docker logs kafka-consumer
```

You should see:
```
🔌 Connecting to MongoDB at mongodb://admin:admin123@mongodb:27017/
✅ Connected to MongoDB database: meeting_summaries
🟣 Kafka Consumer started. Waiting for messages...
```

---

## 📤 STEP 2: Send Transcripts (Run Producer Once)

Copy and paste this command:
```powershell
docker run --rm --network kafka_summary_pipeline_kafka-network -v ${PWD}:/app -w /app -e KAFKA_BROKER=kafka:9092 -e KAFKA_TOPIC=transcripts python:3.11-slim bash -c "pip install kafka-python -q && python producer/producer_once.py"
```

Expected output:
```
🟢 Kafka Producer started. Sending transcripts...
📤 Sent: Team Sync - Product Updates
📤 Sent: Client Meeting - ABC Corp
✅ All transcripts sent! Producer finished.
```

---

## 🔍 STEP 3: Verify Summaries Were Saved

Check consumer logs:
```powershell
docker logs kafka-consumer --tail=50
```

You should see:
```
📩 Received new transcript: Team Sync - Product Updates
🧠 Summarizing: Team Sync - Product Updates
✅ Summary saved to MongoDB with ID: 690xxxxx...
📊 Database: meeting_summaries, Collection: summaries
```

---

## 📮 STEP 4: Test with Postman

### Open Postman and create these requests:

### 1️⃣ Health Check
```
GET http://localhost:8000/
```
Click "Send" - You should see API info

---

### 2️⃣ Get All Summaries
```
GET http://localhost:8000/summaries
```
Click "Send" - You should see all summaries with IDs

**Copy one of the IDs** from the response for the next steps!

---

### 3️⃣ Get Specific Summary
```
GET http://localhost:8000/summaries/PUT_ID_HERE
```
Replace `PUT_ID_HERE` with an actual ID from step 2
Click "Send" - You should see that specific summary

---

### 4️⃣ Get Statistics
```
GET http://localhost:8000/stats
```
Click "Send" - You should see total count

---

### 5️⃣ Delete a Summary
```
DELETE http://localhost:8000/summaries/PUT_ID_HERE
```
Replace `PUT_ID_HERE` with an actual ID
Click "Send" - You should see deletion confirmation

---

### 6️⃣ Verify Deletion
```
GET http://localhost:8000/summaries
```
Click "Send" - The deleted summary should be gone!

---

## 🌐 Interactive API Documentation

Open your browser and go to:
```
http://localhost:8000/docs
```

This shows interactive Swagger UI where you can test all endpoints directly!

---

## 🎯 Quick Test Flow

1. ✅ Run producer command (Step 2)
2. ✅ Open Postman
3. ✅ GET `http://localhost:8000/summaries` 
4. ✅ Copy an ID from response
5. ✅ GET `http://localhost:8000/summaries/{that_id}`
6. ✅ DELETE `http://localhost:8000/summaries/{that_id}`
7. ✅ GET `http://localhost:8000/summaries` again to confirm deletion

---

## 📸 Expected Postman Screenshots

### GET /summaries Response:
```json
{
  "total": 2,
  "summaries": [
    {
      "id": "6901093c747668df6a97ea57",
      "title": "Client Meeting - ABC Corp",
      "summary": "## Meeting Summary\n- Overview: ..."
    }
  ]
}
```

### GET /summaries/{id} Response:
```json
{
  "id": "6901093c747668df6a97ea57",
  "title": "Client Meeting - ABC Corp",
  "content": "Full transcript...",
  "summary": "Full summary..."
}
```

### DELETE /summaries/{id} Response:
```json
{
  "message": "Summary deleted successfully",
  "id": "6901093c747668df6a97ea57"
}
```

---

## 🛑 When Done Testing

Stop all services:
```powershell
docker-compose down
```

---

## ⚡ That's It!

You now have a complete Kafka pipeline that:
1. ✅ Produces meeting transcripts
2. ✅ Consumes them in real-time
3. ✅ Generates AI summaries
4. ✅ Stores in MongoDB
5. ✅ Exposes REST API for access

Test all 5 Postman endpoints to confirm everything works!
