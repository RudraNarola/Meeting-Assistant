#!/bin/bash

# Script to upload a real MP3 file to the transcript generator
# Usage: ./upload_audio.sh <path-to-mp3-file> [meeting-title] [platform]

if [ -z "$1" ]; then
    echo "❌ Error: No audio file provided"
    echo ""
    echo "Usage: ./upload_audio.sh <audio-file> [title] [platform]"
    echo ""
    echo "Examples:"
    echo "  ./upload_audio.sh ~/Downloads/meeting.mp3"
    echo "  ./upload_audio.sh ~/Downloads/meeting.mp3 'Team Standup' 'zoom'"
    echo "  ./upload_audio.sh ~/Downloads/meeting.mp3 'Client Call' 'google-meet'"
    exit 1
fi

AUDIO_FILE="$1"
TITLE="${2:-Meeting from MP3 file}"
PLATFORM="${3:-zoom}"

# Check if file exists
if [ ! -f "$AUDIO_FILE" ]; then
    echo "❌ Error: File not found: $AUDIO_FILE"
    exit 1
fi

# Get file size
FILE_SIZE=$(ls -lh "$AUDIO_FILE" | awk '{print $5}')
echo "📁 File: $AUDIO_FILE"
echo "📊 Size: $FILE_SIZE"
echo "📝 Title: $TITLE"
echo "🔗 Platform: $PLATFORM"
echo ""
echo "⏳ Uploading audio file..."
echo ""

# Upload the file
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/meetings/upload \
  -F "audio=@$AUDIO_FILE" \
  -F "title=$TITLE" \
  -F "platform=$PLATFORM")

echo "$RESPONSE" | python3 -m json.tool

# Extract meeting ID
MEETING_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['meeting_id'])" 2>/dev/null)

if [ -n "$MEETING_ID" ]; then
    echo ""
    echo "✅ Upload successful!"
    echo "🆔 Meeting ID: $MEETING_ID"
    echo ""
    echo "⏳ Processing will take a few seconds..."
    echo "📊 Check status with:"
    echo "   curl http://localhost:8080/api/v1/meetings/$MEETING_ID/status | python3 -m json.tool"
    echo ""
    echo "📝 Get transcript with:"
    echo "   curl http://localhost:8080/api/v1/meetings/$MEETING_ID/transcript | python3 -m json.tool"
    echo ""
    
    # Wait for processing
    echo "⏰ Waiting for processing to complete..."
    sleep 5
    
    # Check status
    STATUS=$(curl -s http://localhost:8080/api/v1/meetings/$MEETING_ID/status | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
    
    if [ "$STATUS" = "completed" ]; then
        echo "✅ Processing completed!"
        echo ""
        echo "🎯 Fetching transcript..."
        echo ""
        curl -s http://localhost:8080/api/v1/meetings/$MEETING_ID/transcript | python3 -m json.tool
    else
        echo "⏳ Status: $STATUS"
        echo "⏰ Processing may still be in progress. Wait a few more seconds and run:"
        echo "   curl http://localhost:8080/api/v1/meetings/$MEETING_ID/transcript | python3 -m json.tool"
    fi
else
    echo ""
    echo "❌ Upload failed!"
fi
