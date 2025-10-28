# 🎙️ Meeting Summary Pipeline with Kafka

A real-time distributed pipeline that consumes meeting transcripts from Kafka, generates AI-powered summaries using Groq, stores them in MongoDB, and exposes REST APIs for management.

## 🌟 Features

- ✅ **Real-time Processing**: Kafka-based event streaming
- ✅ **AI Summarization**: Groq LLM for intelligent meeting summaries
- ✅ **Persistent Storage**: MongoDB for summary storage
- ✅ **Auto Cleanup**: Automatic transcript file removal after processing
- ✅ **REST API**: Complete CRUD operations
- ✅ **Fully Containerized**: Docker Compose orchestration
- ✅ **Production Ready**: Scalable microservices architecture

## 🏗️ Architecture

```
┌──────────────┐
│   Producer   │ → Sends transcripts to Kafka
└──────┬───────┘
       ↓
┌──────────────┐
│    Kafka     │ → Message broker (with Zookeeper)
└──────┬───────┘
       ↓
┌──────────────┐
│   Consumer   │ → Receives & processes transcripts
└──────┬───────┘
       ↓
┌──────────────┐
│ Summarizer   │ → AI-powered summary generation (Groq API)
└──────┬───────┘
       ↓
┌──────────────┐
│   MongoDB    │ → Persistent storage
└──────┬───────┘
       ↓
┌──────────────┐
│  REST API    │ → Access & manage summaries
└──────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker Desktop installed and running
- Groq API key ([Get one here](https://console.groq.com/))
- Ports available: 2181, 9092, 27017, 8000

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd kafka_summary_pipeline
```

### 2. Configure Environment

Create a `.env` file:

```env
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Start All Services

```bash
docker-compose up -d --build
```

This starts:
- Zookeeper (Kafka coordination)
- Kafka (Message broker)
- MongoDB (Database)
- Consumer (Processes transcripts continuously)
- API (REST endpoints)

**Note:** Producer is disabled by default to prevent automatic data generation.

### 4. Send Test Transcripts

Run the producer manually to send sample transcripts:

**Windows PowerShell:**
```powershell
docker run --rm --network kafka_summary_pipeline_kafka-network -v ${PWD}:/app -w /app -e KAFKA_BROKER=kafka:9092 -e KAFKA_TOPIC=transcripts python:3.11-slim bash -c "pip install kafka-python -q && python producer/producer_once.py"
```

**Linux/Mac:**
```bash
docker run --rm --network kafka_summary_pipeline_kafka-network -v $(pwd):/app -w /app -e KAFKA_BROKER=kafka:9092 -e KAFKA_TOPIC=transcripts python:3.11-slim bash -c "pip install kafka-python -q && python producer/producer_once.py"
```

### 5. Access the API

**Interactive Documentation:**
```
http://localhost:8000/docs
```

**API Endpoints:**
- `GET /summaries` - Get all summaries
- `GET /summaries/{id}` - Get specific summary
- `DELETE /summaries/{id}` - Delete summary

## 📋 API Reference

### Base URL
```
http://localhost:8000
```

### Get All Summaries
```http
GET /summaries
```

**Response:**
```json
{
  "total": 2,
  "summaries": [
    {
      "id": "507f1f77bcf86cd799439011",
      "title": "Team Sync - Product Updates",
      "content": "Full transcript...",
      "summary": "AI-generated summary...",
      "timestamp": "2025-10-29T00:00:00",
      "created_at": "2025-10-29T00:00:00"
    }
  ]
}
```

### Get Specific Summary
```http
GET /summaries/{id}
```

### Delete Summary
```http
DELETE /summaries/{id}
```

## 📁 Project Structure

```
kafka_summary_pipeline/
├── api/
│   └── main.py                    # FastAPI application
├── consumer/
│   └── consumer.py                # Kafka consumer
├── producer/
│   ├── producer.py                # Continuous producer (disabled)
│   └── producer_once.py           # Single-run producer (for testing)
├── summarizer/
│   └── generate_summary.py       # AI summarization logic
├── docker-compose.yml             # Main orchestration
├── docker-compose.api.yml         # API-only service
├── Dockerfile.api                 # API container
├── Dockerfile.consumer            # Consumer container
├── requirements.txt               # Python dependencies
├── .env                           # Environment variables
└── README.md                      # This file
```

## 🛠️ Common Commands

### Check Service Status
```bash
docker-compose ps
```

### View Consumer Logs
```bash
docker-compose logs -f consumer
```

### View API Logs
```bash
docker-compose logs -f api
```

### Stop All Services
```bash
docker-compose down
```

### Stop and Remove Data
```bash
docker-compose down -v
```

## 📝 License

This project is licensed under the MIT License.

---

**Made with ❤️ for efficient meeting management**
