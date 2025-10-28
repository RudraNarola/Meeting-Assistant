# Kafka Summary Pipeline - Complete Structure

## 📁 File Structure

```
kafka_summary_pipeline/
├── docker-compose.yml          # Main orchestration file
├── Dockerfile.producer         # Producer container definition
├── Dockerfile.consumer         # Consumer container definition
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables (GROQ_API_KEY)
├── .gitignore                 # Git ignore rules
├── README.md                  # Documentation
├── start.ps1                  # Windows PowerShell start script
│
├── producer/
│   └── producer.py            # Kafka producer (continuously sends transcripts)
│
├── consumer/
│   └── consumer.py            # Kafka consumer (receives & processes)
│
├── summarizer/
│   └── generate_summary.py   # AI summarization logic (Groq API)
│
└── data/                      # Transcript storage (auto-created)
```

## 🔧 Key Components

### 1. Docker Compose Services
- **zookeeper**: Kafka coordination service
- **kafka**: Message broker
- **producer**: Sends transcripts continuously
- **consumer**: Consumes and summarizes transcripts

### 2. Environment Variables
- `KAFKA_BROKER`: Kafka connection (set to `kafka:9092` in containers)
- `KAFKA_TOPIC`: Topic name (default: `transcripts`)
- `GROQ_API_KEY`: Your Groq API key for AI summarization

### 3. Network Architecture
All services run on a custom bridge network (`kafka-network`) for isolated communication.

## 🚀 Usage

### Option 1: PowerShell Script (Recommended)
```powershell
.\start.ps1
```

### Option 2: Manual Commands
```powershell
# Start all services
docker-compose up -d

# View consumer logs (where summaries appear)
docker-compose logs -f consumer

# View producer logs
docker-compose logs -f producer

# View all logs
docker-compose logs -f

# Stop everything
docker-compose down
```

## 📊 What Happens

1. **Producer** sends a new transcript every 5 seconds
2. **Consumer** receives it immediately
3. **Summarizer** generates AI summary using Groq
4. **Summary** is printed to console (visible in consumer logs)

## 🔍 Monitoring

Check service status:
```powershell
docker-compose ps
```

Check specific container:
```powershell
docker logs kafka-consumer
docker logs kafka-producer
```

## 🛠️ Troubleshooting

**Services won't start:**
- Ensure ports 2181 and 9092 are not in use
- Check Docker Desktop is running
- Verify .env file has valid GROQ_API_KEY

**No summaries appearing:**
- Wait 15-20 seconds after startup
- Check consumer logs: `docker-compose logs consumer`
- Verify Groq API key is correct

**Consumer errors:**
- Kafka might not be ready yet - wait a few seconds
- Check network connectivity between containers

## 📝 Customization

**Change transcript interval:**
Edit `producer/producer.py` - modify `time.sleep(5)` value

**Add more transcripts:**
Edit `producer/producer.py` - add to the `transcripts` list

**Change summary format:**
Edit `summarizer/generate_summary.py` - modify the `prompt` variable
