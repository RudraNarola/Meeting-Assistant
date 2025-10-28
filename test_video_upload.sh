#!/bin/bash

# Test script for video upload functionality
# Usage: ./test_video_upload.sh [video_file_path]

AUDIO_SERVICE_URL="${AUDIO_SERVICE_URL:-http://localhost:8081}"
VIDEO_FILE="${1:-test_video.mp4}"

echo "=================================="
echo "Video Upload Test Script"
echo "=================================="
echo "Audio Service URL: $AUDIO_SERVICE_URL"
echo "Video File: $VIDEO_FILE"
echo ""

# Check if file exists
if [ ! -f "$VIDEO_FILE" ]; then
    echo "Error: Video file '$VIDEO_FILE' not found!"
    echo ""
    echo "Usage: $0 [video_file_path]"
    echo "Example: $0 /path/to/video.mp4"
    exit 1
fi

# Check file extension
FILE_EXT="${VIDEO_FILE##*.}"
echo "File extension: .$FILE_EXT"
echo ""

# Test 1: Health check
echo "Test 1: Health Check"
echo "--------------------"
HEALTH_RESPONSE=$(curl -s "$AUDIO_SERVICE_URL/health")
echo "Response: $HEALTH_RESPONSE"
echo ""

# Test 2: Upload video file
echo "Test 2: Upload Video File"
echo "-------------------------"
UPLOAD_RESPONSE=$(curl -s -X POST "$AUDIO_SERVICE_URL/upload" \
  -F "file=@$VIDEO_FILE" \
  -F "title=Test Video Upload" \
  -F "platform=test")

echo "Response:"
echo "$UPLOAD_RESPONSE" | jq '.' 2>/dev/null || echo "$UPLOAD_RESPONSE"
echo ""

# Extract meeting ID from response
MEETING_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.meeting_id' 2>/dev/null)

if [ "$MEETING_ID" != "null" ] && [ ! -z "$MEETING_ID" ]; then
    echo "Meeting ID: $MEETING_ID"
    echo ""
    
    # Test 3: Get audio files for the meeting
    echo "Test 3: Get Audio Files"
    echo "----------------------"
    AUDIO_RESPONSE=$(curl -s "$AUDIO_SERVICE_URL/meetings/$MEETING_ID/audio")
    echo "Response:"
    echo "$AUDIO_RESPONSE" | jq '.' 2>/dev/null || echo "$AUDIO_RESPONSE"
    echo ""
    
    # Test 4: Get video files for the meeting
    echo "Test 4: Get Video Files"
    echo "----------------------"
    VIDEO_RESPONSE=$(curl -s "$AUDIO_SERVICE_URL/meetings/$MEETING_ID/videos")
    echo "Response:"
    echo "$VIDEO_RESPONSE" | jq '.' 2>/dev/null || echo "$VIDEO_RESPONSE"
    echo ""
else
    echo "Error: Could not extract meeting ID from upload response"
    echo "Upload may have failed. Check the response above."
fi

echo "=================================="
echo "Test Complete"
echo "=================================="
