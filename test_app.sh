#!/bin/bash

# Test script for Meeting Transcript Generator
# This works WITHOUT any external API keys!

set -e

API_BASE="http://localhost:8080/api/v1"

echo "=================================="
echo "Meeting Transcript Generator Test"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if services are running
echo -e "${BLUE}1. Checking if services are running...${NC}"
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API Gateway is running${NC}"
else
    echo -e "${YELLOW}⚠ API Gateway not running. Start with: docker-compose up -d${NC}"
    exit 1
fi
echo ""

# Create a test audio file (empty file for demo)
echo -e "${BLUE}2. Creating test audio file...${NC}"
TEST_FILE="test-meeting.mp3"
# Create a small dummy file
echo "This is a test audio file" > $TEST_FILE
echo -e "${GREEN}✓ Created $TEST_FILE${NC}"
echo ""

# Upload the audio
echo -e "${BLUE}3. Uploading audio file...${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST $API_BASE/meetings/upload \
  -F "audio=@$TEST_FILE" \
  -F "title=Demo Meeting - Testing Transcript Generator" \
  -F "platform=zoom")

echo "$UPLOAD_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$UPLOAD_RESPONSE"

MEETING_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"meeting_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$MEETING_ID" ]; then
    echo -e "${YELLOW}Failed to extract meeting ID${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Audio uploaded successfully${NC}"
echo -e "Meeting ID: ${YELLOW}$MEETING_ID${NC}"
echo ""

# Wait for processing
echo -e "${BLUE}4. Waiting for transcription and diarization...${NC}"
echo "This usually takes 5-10 seconds..."

MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    STATUS_RESPONSE=$(curl -s $API_BASE/meetings/$MEETING_ID/status)
    STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$STATUS" = "completed" ]; then
        echo -e "${GREEN}✓ Processing completed!${NC}"
        break
    elif [ "$STATUS" = "failed" ]; then
        echo -e "${YELLOW}Processing failed!${NC}"
        exit 1
    fi
    
    echo -n "."
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done
echo ""
echo ""

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${YELLOW}Timeout waiting for processing${NC}"
    exit 1
fi

# Get the full transcript
echo -e "${BLUE}5. Fetching transcript with speaker identification...${NC}"
TRANSCRIPT=$(curl -s $API_BASE/meetings/$MEETING_ID/transcript)

# Save to file
echo "$TRANSCRIPT" > transcript_result.json
echo -e "${GREEN}✓ Full transcript saved to: transcript_result.json${NC}"
echo ""

# Display readable transcript
echo -e "${BLUE}6. Transcript Preview:${NC}"
echo "=================================="

# Parse and display (works with or without jq)
if command -v jq &> /dev/null; then
    echo ""
    echo "Meeting: $(echo "$TRANSCRIPT" | jq -r '.meeting.title')"
    echo "Platform: $(echo "$TRANSCRIPT" | jq -r '.meeting.platform')"
    echo "Duration: $(echo "$TRANSCRIPT" | jq -r '.duration') seconds"
    echo ""
    echo "=== SPEAKERS ==="
    echo "$TRANSCRIPT" | jq -r '.speakers[] | "- \(.label) (ID: \(.id))"'
    echo ""
    echo "=== TRANSCRIPT SEGMENTS ==="
    echo "$TRANSCRIPT" | jq -r '.segments[] | "[\(.start_time)s] \(.speaker_name): \(.text)"'
else
    # Fallback without jq
    echo "$TRANSCRIPT" | python3 -m json.tool
fi

echo ""
echo "=================================="
echo ""

# Get speaker IDs for updating
echo -e "${BLUE}7. You can now update speaker names:${NC}"
if command -v jq &> /dev/null; then
    SPEAKER_IDS=$(echo "$TRANSCRIPT" | jq -r '.speakers[].id')
    COUNTER=1
    for SPEAKER_ID in $SPEAKER_IDS; do
        echo -e "Speaker $COUNTER ID: ${YELLOW}$SPEAKER_ID${NC}"
        echo "  Update with: curl -X PUT $API_BASE/speakers/$SPEAKER_ID -H 'Content-Type: application/json' -d '{\"name\": \"Your Name\"}'"
        COUNTER=$((COUNTER + 1))
    done
else
    echo "Install jq to see speaker IDs automatically"
    echo "Or check transcript_result.json file"
fi

echo ""
echo -e "${GREEN}✓ Test completed successfully!${NC}"
echo ""
echo "Files created:"
echo "  - $TEST_FILE (test audio file)"
echo "  - transcript_result.json (full transcript with speakers)"
echo ""
echo "Cleanup: rm $TEST_FILE transcript_result.json"
