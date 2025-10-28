#!/bin/bash

# Quick test script to verify Whisper integration
# This will create a test meeting and show if Whisper is working

echo "🧪 Testing Whisper Integration"
echo "=============================="
echo ""

# Check if all services are running
echo "1️⃣ Checking services..."
if ! curl -s http://localhost:8084/health > /dev/null 2>&1; then
    echo "❌ Whisper service is not running!"
    echo "Run: docker compose up -d"
    exit 1
fi

echo "✅ Whisper service: Running"
echo "✅ Model loaded: $(curl -s http://localhost:8084/health | python3 -c 'import sys, json; print(json.load(sys.stdin)["model"])')"
echo ""

# Check if user provided an audio file
if [ -n "$1" ] && [ -f "$1" ]; then
    echo "2️⃣ Using your audio file: $1"
    AUDIO_FILE="$1"
    TITLE="${2:-Real Meeting Transcription}"
else
    echo "2️⃣ No audio file provided. Using test file..."
    echo ""
    echo "📝 To test with your own MP3 file, run:"
    echo "   ./test_whisper.sh /path/to/your/audio.mp3"
    echo ""
    echo "Creating a test file (silent audio)..."
    
    # Create a 3-second silent audio file for testing
    if command -v ffmpeg &> /dev/null; then
        ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 3 -q:a 9 -acodec libmp3lame test_silent.mp3 -y 2>/dev/null
        AUDIO_FILE="test_silent.mp3"
        TITLE="Test Silent Audio"
        echo "✅ Created test_silent.mp3"
    else
        echo "⚠️  FFmpeg not found. Cannot create test file."
        echo "Please provide your own MP3 file:"
        echo "   ./test_whisper.sh /path/to/your/audio.mp3"
        exit 1
    fi
fi

echo ""
echo "3️⃣ Uploading audio to transcription service..."

# Upload the audio file
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/meetings/upload \
  -F "audio=@$AUDIO_FILE" \
  -F "title=$TITLE" \
  -F "platform=zoom")

MEETING_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['meeting_id'])" 2>/dev/null)

if [ -z "$MEETING_ID" ]; then
    echo "❌ Upload failed!"
    echo "$RESPONSE" | python3 -m json.tool
    exit 1
fi

echo "✅ Uploaded successfully!"
echo "🆔 Meeting ID: $MEETING_ID"
echo ""

echo "4️⃣ Waiting for Whisper to process the audio..."
echo "   (This may take 10-60 seconds depending on file size)"
echo ""

# Wait and check status
for i in {1..30}; do
    sleep 2
    STATUS=$(curl -s http://localhost:8080/api/v1/meetings/$MEETING_ID/status | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', 'unknown'))" 2>/dev/null)
    
    echo "   ⏰ Status check $i/30: $STATUS"
    
    if [ "$STATUS" = "completed" ]; then
        echo ""
        echo "✅ Processing completed!"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo ""
        echo "⏰ Timeout waiting for processing. Check logs:"
        echo "   docker compose logs transcription-service"
        echo "   docker compose logs whisper-service"
        exit 1
    fi
done

echo ""
echo "5️⃣ Fetching transcript..."
echo ""

TRANSCRIPT=$(curl -s http://localhost:8080/api/v1/meetings/$MEETING_ID/transcript)

# Check if transcript has real content or mock content
TEXT=$(echo "$TRANSCRIPT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('full_text', ''))" 2>/dev/null)

echo "=============================="
echo "📊 RESULTS"
echo "=============================="
echo ""

if [ ${#TEXT} -gt 0 ]; then
    echo "✅ Transcription completed!"
    echo ""
    echo "Full Transcript:"
    echo "----------------"
    echo "$TEXT"
    echo ""
    
    # Check if it's mock or real
    if echo "$TEXT" | grep -q "Hello everyone, thank you for joining"; then
        echo "⚠️  NOTE: This appears to be MOCK transcription data."
        echo ""
        echo "📝 Whisper might have failed. Check logs:"
        echo "   docker compose logs transcription-service --tail=100"
        echo "   docker compose logs whisper-service --tail=100"
        echo ""
        echo "Common reasons:"
        echo "   • Audio file is silent or very quiet"
        echo "   • Audio format not supported"
        echo "   • Whisper service not responding"
    else
        echo "✅ This is REAL Whisper transcription! 🎉"
        echo ""
        echo "🎯 Whisper is working correctly with real audio!"
    fi
else
    echo "❌ No transcript text found"
fi

echo ""
echo "=============================="
echo ""

# Show how to view full details
echo "📝 To see full transcript with speaker tags:"
echo "   curl http://localhost:8080/api/v1/meetings/$MEETING_ID/transcript | python3 -m json.tool"
echo ""
echo "📊 To view detailed logs:"
echo "   docker compose logs transcription-service --tail=100"
echo "   docker compose logs whisper-service --tail=100"
