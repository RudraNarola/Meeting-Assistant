# Quick Start Guide (No API Keys Needed!)

This application works **completely offline** with built-in mock transcription and speaker diarization. No external API keys required!

## What You Get

✅ Automatic speech-to-text transcription (simulated)  
✅ Speaker identification and separation  
✅ Speaker name assignment  
✅ Complete transcript with timestamps  
✅ All running locally in Docker

## Step 1: Start the Application

```bash
# Start all services
docker-compose up -d

# Wait about 30 seconds for services to initialize

# Check if running
curl http://localhost:8080/health
```

You should see: `{"status":"healthy","service":"api-gateway"}`

## Step 2: Test with Sample Script

### Option A: Using Bash Script

```bash
# Make executable
chmod +x test_app.sh

# Run test
./test_app.sh
```

### Option B: Using Python Script

```bash
# Run test
python3 test_app.py
```

Both scripts will:

1. ✓ Check if services are running
2. ✓ Create a test audio file
3. ✓ Upload it to the system
4. ✓ Wait for processing (transcription + speaker diarization)
5. ✓ Show you the complete transcript with speakers
6. ✓ Save results to `transcript_result.json`

## Step 3: Upload Your Own Audio

You can upload any audio file (mp3, wav, m4a, etc.):

```bash
curl -X POST http://localhost:8080/api/v1/meetings/upload \
  -F "audio=@/path/to/your-meeting.mp3" \
  -F "title=My Team Meeting" \
  -F "platform=zoom"
```

**Important**: The mock transcription generates sample text. To use real audio:

- You'll need to integrate Google Cloud Speech-to-Text, Azure Speech Services, or AWS Transcribe
- Instructions are in the code comments (search for "TODO")

## Step 4: View Results

After upload, save the `meeting_id` and then:

```bash
# Check status
curl http://localhost:8080/api/v1/meetings/{MEETING_ID}/status

# Get full transcript with speakers
curl http://localhost:8080/api/v1/meetings/{MEETING_ID}/transcript
```

## Step 5: Update Speaker Names

The system automatically identifies speakers as "Speaker 1", "Speaker 2", etc.
You can update them with real names:

```bash
curl -X PUT http://localhost:8080/api/v1/speakers/{SPEAKER_ID} \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe"}'
```

## Example Output

When you run the test script, you'll see output like:

```
=== SPEAKERS ===
  - Speaker 1 (ID: abc-123-def)
  - Speaker 2 (ID: xyz-789-uvw)

=== TRANSCRIPT SEGMENTS ===
[0.0s] Speaker 1: Hello everyone, thank you for joining today's meeting.
[4.5s] Speaker 2: Good morning. I'd like to share an update on the project.
[9.2s] Speaker 1: That's great. Let's hear what you have.
[13.8s] Speaker 2: We completed the authentication module this week.
...
```

## How Mock Services Work

### Mock Transcription

- Generates realistic meeting conversation text
- Simulates processing time (2-3 seconds)
- Returns confidence scores
- Creates natural dialogue

### Mock Speaker Diarization

- Automatically detects 2-3 speakers based on content
- Assigns speaker labels
- Segments transcript by speaker
- Adds realistic timestamps

## View All Services

```bash
# API Gateway
http://localhost:8080

# RabbitMQ Management
http://localhost:15672 (admin/admin123)

# Check logs
docker-compose logs -f

# Check specific service
docker-compose logs -f transcription-service
```

## Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove data
docker-compose down -v
```

## Troubleshooting

### Services won't start

```bash
docker-compose down
docker-compose up -d
docker-compose logs
```

### Port already in use

```bash
# Check what's using port 8080
lsof -i :8080

# Kill the process or change port in docker-compose.yml
```

### Processing stuck

```bash
# Check service logs
docker-compose logs transcription-service
docker-compose logs diarization-service

# Restart services
docker-compose restart
```

## What's Next?

### For Production Use with Real Audio:

The application is designed to easily integrate with real transcription services:

1. **Google Cloud Speech-to-Text**

   - Get API key from Google Cloud Console
   - Update transcription service code
   - Uncomment Google Cloud SDK code

2. **Azure Cognitive Services**

   - Get API key from Azure Portal
   - Update transcription service
   - Add Azure SDK

3. **AWS Transcribe**
   - Configure AWS credentials
   - Update transcription service
   - Add AWS SDK

See `docs/DEPLOYMENT.md` for detailed integration instructions.

## Need Help?

- Check the full README.md for detailed documentation
- View API_EXAMPLES.md for complete API reference
- Check DEPLOYMENT.md for production setup

## Remember

🎯 **No API keys needed for testing!**  
🎯 **Everything runs locally**  
🎯 **Mock services simulate real transcription**  
🎯 **Perfect for development and testing**
