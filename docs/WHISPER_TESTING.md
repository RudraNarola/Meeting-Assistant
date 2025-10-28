# 🎙️ Testing with Real MP3 Files using Whisper AI

Your application now uses **OpenAI's Whisper** for real audio transcription! No API keys needed - it runs completely locally.

## ✅ What's New

- **Real Transcription**: Whisper AI converts actual speech to text
- **90+ Languages**: Supports multilingual audio
- **No API Keys**: Runs completely offline
- **High Accuracy**: Professional-grade transcription
- **Speaker Diarization**: Still identifies different speakers

## 🚀 Quick Start - Test with Your MP3 File

### Method 1: Using the Upload Script (Easiest)

```bash
./upload_audio.sh /path/to/your/meeting.mp3
```

Or with custom details:

```bash
./upload_audio.sh ~/Downloads/team-meeting.mp3 "Weekly Standup" "zoom"
./upload_audio.sh ~/Music/podcast.mp3 "Podcast Episode" "google-meet"
```

### Method 2: Using the Test Script

```bash
# With your own file
./test_whisper.sh /path/to/your/audio.mp3

# Will show:
# ✅ Whisper service status
# ✅ Upload progress
# ✅ Processing status
# ✅ Final transcript
# ✅ Whether it's real or mock data
```

### Method 3: Using curl Directly

```bash
# 1. Upload your MP3 file
curl -X POST http://localhost:8080/api/v1/meetings/upload \
  -F "audio=@/path/to/your/meeting.mp3" \
  -F "title=My Meeting" \
  -F "platform=zoom"

# 2. Get the meeting_id from response, then wait ~30 seconds

# 3. Fetch the transcript
curl http://localhost:8080/api/v1/meetings/YOUR_MEETING_ID/transcript | python3 -m json.tool
```

### Method 4: Using Python

```bash
python3 test_app.py /path/to/your/meeting.mp3
```

## ⏱️ Processing Time

| File Duration | Expected Time  |
| ------------- | -------------- |
| 1 minute      | ~10-15 seconds |
| 5 minutes     | ~30-60 seconds |
| 10 minutes    | ~1-2 minutes   |
| 30 minutes    | ~3-5 minutes   |

## 📁 Supported Audio Formats

Whisper supports all common formats:

- ✅ MP3
- ✅ WAV
- ✅ M4A
- ✅ FLAC
- ✅ OGG
- ✅ WebM
- ✅ Any format FFmpeg can read

## 🧪 Testing

### Step 1: Verify Services are Running

```bash
# Check all services
docker compose ps

# Check Whisper specifically
curl http://localhost:8084/health
```

Expected output:

```json
{
  "status": "healthy",
  "service": "whisper-service",
  "model": "base",
  "model_loaded": true
}
```

### Step 2: Upload a Real MP3 File

```bash
./upload_audio.sh ~/Downloads/your-meeting.mp3
```

The script will:

1. Upload your audio file
2. Wait for Whisper to process it
3. Display the real transcription
4. Show speaker-tagged segments

### Step 3: Check the Results

The transcript will include:

- **Full Text**: Complete transcription
- **Speakers**: Speaker 1, Speaker 2, etc.
- **Segments**: Each phrase with timestamps
- **Confidence**: Transcription accuracy scores

## 🔍 How to Tell if Whisper is Working

### Real Whisper Transcription:

- Matches your actual audio content
- Contains the exact words spoken
- Language detected automatically
- Timestamps match audio timing

### Mock Transcription (Fallback):

- Generic meeting dialogue
- Starts with "Hello everyone, thank you for joining..."
- Doesn't match your audio content

## 🐛 Troubleshooting

### 1. Whisper Service Not Running

```bash
# Check if container is running
docker compose ps whisper-service

# View logs
docker compose logs whisper-service

# Restart if needed
docker compose restart whisper-service
```

### 2. Model Not Loaded

```bash
# Check logs - should see "Whisper model 'base' loaded successfully"
docker compose logs whisper-service --tail=50

# Model download happens on first start (takes ~30 seconds)
```

### 3. Transcription Taking Too Long

```bash
# Check transcription service logs
docker compose logs transcription-service --tail=100

# Check if Whisper is processing
docker compose logs whisper-service --tail=100

# For large files, increase timeout or use smaller model
```

### 4. Getting Mock Data Instead of Real Transcription

Possible causes:

- Whisper service not responding
- Audio file is silent or corrupted
- Network issue between services

Check:

```bash
# Test Whisper directly
curl -X POST http://localhost:8084/transcribe \
  -F "file=@/path/to/your/audio.mp3" \
  -F "language=en"
```

### 5. Out of Memory

If you see memory errors:

```bash
# Use a smaller Whisper model
# Edit docker-compose.yml:
#   WHISPER_MODEL=tiny     # Instead of 'base'

docker compose down
docker compose up -d
```

## ⚙️ Whisper Model Options

| Model    | Size  | RAM   | Speed     | Quality | Best For                  |
| -------- | ----- | ----- | --------- | ------- | ------------------------- |
| tiny     | 39M   | ~1GB  | Very Fast | Basic   | Quick tests               |
| **base** | 74M   | ~1GB  | Fast      | Good    | **Default (recommended)** |
| small    | 244M  | ~2GB  | Medium    | Better  | Accuracy matters          |
| medium   | 769M  | ~5GB  | Slow      | High    | Professional use          |
| large    | 1.5GB | ~10GB | Very Slow | Best    | Maximum accuracy          |

To change the model, edit `docker-compose.yml`:

```yaml
whisper-service:
  environment:
    - WHISPER_MODEL=small  # Change this
```

Then restart:

```bash
docker compose restart whisper-service
```

## 📊 Performance Tips

1. **Audio Quality**: Higher quality = better transcription
2. **File Size**: Keep under 30 minutes for best results
3. **Background Noise**: Minimize for better accuracy
4. **Multiple Speakers**: Clear separation helps diarization
5. **Language**: Specify language for faster processing

## 🎯 Example Workflow

```bash
# 1. Start services
docker compose up -d

# 2. Wait for Whisper to load (30 seconds)
docker compose logs whisper-service --follow

# 3. Upload your meeting recording
./upload_audio.sh ~/Downloads/team-meeting-2024-10-28.mp3 "Team Standup" "zoom"

# 4. Wait for processing (~1 minute for 5-min audio)

# 5. View transcript with speaker tags
curl http://localhost:8080/api/v1/meetings/MEETING_ID/transcript | python3 -m json.tool
```

## 📝 What You Get

Your transcript will include:

```json
{
  "meeting": {
    "title": "Team Standup",
    "status": "completed"
  },
  "speakers": [
    {"label": "Speaker 1"},
    {"label": "Speaker 2"}
  ],
  "segments": [
    {
      "text": "Good morning everyone",
      "speaker_id": "...",
      "start_time": 0.0,
      "end_time": 2.5,
      "confidence": 0.95
    }
  ],
  "full_text": "Good morning everyone..."
}
```

## 🚀 Ready to Test?

```bash
# Option 1: Quick test with your MP3
./upload_audio.sh ~/Downloads/your-audio.mp3

# Option 2: Detailed test with status checks
./test_whisper.sh ~/Downloads/your-audio.mp3

# Option 3: Manual curl test
curl -X POST http://localhost:8080/api/v1/meetings/upload \
  -F "audio=@~/Downloads/your-audio.mp3" \
  -F "title=Test Meeting"
```

## 🎉 That's It!

You now have a fully functional meeting transcript generator with:

- ✅ Real audio transcription (Whisper AI)
- ✅ Speaker identification
- ✅ Timestamp accuracy
- ✅ No API keys required
- ✅ Runs completely offline
- ✅ Supports 90+ languages

Happy transcribing! 🎙️
