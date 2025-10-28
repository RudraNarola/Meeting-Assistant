#!/bin/bash

# Example script demonstrating video upload with audio extraction
# This script shows the complete workflow from video upload to transcript retrieval

set -e

API_URL="${API_URL:-http://localhost:8080/api/v1}"
VIDEO_FILE="${1:-example_video.mp4}"

echo "=========================================="
echo "Video Upload & Transcription Demo"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if video file exists
if [ ! -f "$VIDEO_FILE" ]; then
    print_error "Video file '$VIDEO_FILE' not found!"
    echo ""
    echo "Usage: $0 [video_file_path]"
    echo "Example: $0 /path/to/meeting_video.mp4"
    echo ""
    print_info "If you don't have a video file, you can create a short test video:"
    echo "  ffmpeg -f lavfi -i testsrc=duration=10:size=1280x720:rate=1 -f lavfi -i sine=frequency=1000:duration=10 test_video.mp4"
    exit 1
fi

print_info "Using video file: $VIDEO_FILE"
FILE_SIZE=$(du -h "$VIDEO_FILE" | cut -f1)
print_info "File size: $FILE_SIZE"
echo ""

# Step 1: Health Check
print_info "Step 1: Checking API Gateway health..."
HEALTH_RESPONSE=$(curl -s "$API_URL/../health" || echo "")
if [ -z "$HEALTH_RESPONSE" ]; then
    print_error "API Gateway is not responding. Please start the services first."
    echo "Run: docker-compose up -d"
    exit 1
fi
print_info "API Gateway is healthy ✓"
echo ""

# Step 2: Upload Video
print_info "Step 2: Uploading video file..."
print_info "This will automatically extract audio using FFmpeg..."
UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/meetings/upload" \
  -F "file=@$VIDEO_FILE" \
  -F "title=Demo Video Meeting $(date +%Y-%m-%d_%H:%M:%S)" \
  -F "platform=zoom")

echo "Upload Response:"
echo "$UPLOAD_RESPONSE" | jq '.' 2>/dev/null || echo "$UPLOAD_RESPONSE"
echo ""

# Extract meeting ID
MEETING_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.meeting_id' 2>/dev/null)

if [ "$MEETING_ID" = "null" ] || [ -z "$MEETING_ID" ]; then
    print_error "Failed to upload video or extract meeting ID"
    print_error "Response: $UPLOAD_RESPONSE"
    exit 1
fi

print_info "Meeting ID: $MEETING_ID"
print_info "Video uploaded and audio extracted successfully ✓"
echo ""

# Step 3: Check Meeting Status
print_info "Step 3: Checking meeting status..."
STATUS_RESPONSE=$(curl -s "$API_URL/meetings/$MEETING_ID/status")
echo "Status Response:"
echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"
echo ""

MEETING_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status' 2>/dev/null)
print_info "Current status: $MEETING_STATUS"
echo ""

# Step 4: Get Video Files
print_info "Step 4: Retrieving video file information..."
VIDEO_RESPONSE=$(curl -s "$API_URL/meetings/$MEETING_ID/videos" 2>/dev/null || echo '{"error":"endpoint not exposed via gateway"}')
if echo "$VIDEO_RESPONSE" | grep -q "error"; then
    print_warning "Video endpoint not available via API Gateway"
    print_info "Trying direct audio service..."
    VIDEO_RESPONSE=$(curl -s "http://localhost:8081/meetings/$MEETING_ID/videos")
fi
echo "Video Files Response:"
echo "$VIDEO_RESPONSE" | jq '.' 2>/dev/null || echo "$VIDEO_RESPONSE"
echo ""

# Step 5: Get Audio Files
print_info "Step 5: Retrieving extracted audio information..."
AUDIO_RESPONSE=$(curl -s "$API_URL/meetings/$MEETING_ID/audio" 2>/dev/null || curl -s "http://localhost:8081/meetings/$MEETING_ID/audio")
echo "Audio Files Response:"
echo "$AUDIO_RESPONSE" | jq '.' 2>/dev/null || echo "$AUDIO_RESPONSE"
echo ""

# Step 6: Wait for Processing
print_info "Step 6: Waiting for transcription to complete..."
print_warning "This may take a while depending on video length..."

MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    STATUS_RESPONSE=$(curl -s "$API_URL/meetings/$MEETING_ID/status")
    MEETING_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status' 2>/dev/null)
    
    if [ "$MEETING_STATUS" = "completed" ]; then
        print_info "Transcription completed! ✓"
        break
    elif [ "$MEETING_STATUS" = "failed" ]; then
        print_error "Transcription failed!"
        exit 1
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    echo -n "."
    sleep 5
done
echo ""

if [ "$MEETING_STATUS" != "completed" ]; then
    print_warning "Transcription is still processing (status: $MEETING_STATUS)"
    print_warning "You can check the transcript later using:"
    echo "  curl $API_URL/meetings/$MEETING_ID/transcript"
    echo ""
    exit 0
fi

# Step 7: Get Transcript
print_info "Step 7: Retrieving transcript..."
TRANSCRIPT_RESPONSE=$(curl -s "$API_URL/meetings/$MEETING_ID/transcript")
echo "Transcript Response:"
echo "$TRANSCRIPT_RESPONSE" | jq '.' 2>/dev/null || echo "$TRANSCRIPT_RESPONSE"
echo ""

# Step 8: Display Summary
print_info "=========================================="
print_info "Summary"
print_info "=========================================="
print_info "Meeting ID: $MEETING_ID"
print_info "Status: $MEETING_STATUS"

SPEAKERS_COUNT=$(echo "$TRANSCRIPT_RESPONSE" | jq -r '.speakers | length' 2>/dev/null || echo "0")
SEGMENTS_COUNT=$(echo "$TRANSCRIPT_RESPONSE" | jq -r '.segments | length' 2>/dev/null || echo "0")
DURATION=$(echo "$TRANSCRIPT_RESPONSE" | jq -r '.duration' 2>/dev/null || echo "0")

print_info "Number of speakers: $SPEAKERS_COUNT"
print_info "Number of segments: $SEGMENTS_COUNT"
print_info "Duration: $DURATION seconds"
echo ""

# Step 9: Show Transcript Segments
if [ "$SEGMENTS_COUNT" != "0" ] && [ "$SEGMENTS_COUNT" != "null" ]; then
    print_info "First few transcript segments:"
    echo "$TRANSCRIPT_RESPONSE" | jq -r '.segments[:5] | .[] | "[" + (.start_time|tostring) + "s] " + .speaker_name + ": " + .text' 2>/dev/null
    echo ""
fi

# Step 10: Speaker Management Example
if [ "$SPEAKERS_COUNT" != "0" ] && [ "$SPEAKERS_COUNT" != "null" ]; then
    print_info "Step 8: Speaker Management (Optional)"
    print_info "You can update speaker names with:"
    
    FIRST_SPEAKER_ID=$(echo "$TRANSCRIPT_RESPONSE" | jq -r '.speakers[0].id' 2>/dev/null)
    if [ "$FIRST_SPEAKER_ID" != "null" ] && [ ! -z "$FIRST_SPEAKER_ID" ]; then
        echo ""
        echo "  curl -X PUT $API_URL/speakers/$FIRST_SPEAKER_ID \\"
        echo "    -H \"Content-Type: application/json\" \\"
        echo "    -d '{\"name\": \"John Doe\"}'"
    fi
    echo ""
fi

print_info "=========================================="
print_info "Demo Complete!"
print_info "=========================================="
print_info "Your video has been uploaded, audio extracted, and transcribed!"
echo ""
print_info "Next steps:"
echo "  1. Update speaker names using the speaker IDs"
echo "  2. Retrieve the full transcript anytime: curl $API_URL/meetings/$MEETING_ID/transcript"
echo "  3. Check meeting status: curl $API_URL/meetings/$MEETING_ID/status"
echo ""
