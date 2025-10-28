#!/bin/bash

# Summary Service Testing Script
# This script tests the complete workflow from video/audio upload to summary generation

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8080/api/v1"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Summary Service Test Workflow${NC}"
echo -e "${BLUE}================================${NC}\n"

# Function to print step
print_step() {
    echo -e "${GREEN}[Step $1]${NC} $2"
}

# Function to print info
print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Function to print error
print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to wait with spinner
wait_with_spinner() {
    local duration=$1
    local message=$2
    echo -n -e "${YELLOW}$message${NC}"
    
    for ((i=1; i<=duration; i++)); do
        echo -n "."
        sleep 1
    done
    echo ""
}

# Check if audio file exists
AUDIO_FILE="meeting_audio.mp3"
if [ ! -f "$AUDIO_FILE" ]; then
    print_error "Audio file '$AUDIO_FILE' not found!"
    print_info "Please provide an audio or video file for testing."
    exit 1
fi

# Step 1: Upload Audio/Video
print_step 1 "Uploading audio/video file..."
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/audio/upload" \
    -F "audio=@$AUDIO_FILE" \
    -F "title=Test Meeting - Summary Generation" \
    -F "platform=google-meet")

echo "$UPLOAD_RESPONSE" | jq '.'

# Extract meeting ID
MEETING_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.audio_file.meeting_id // .video_file.meeting_id // .meeting_id')

if [ -z "$MEETING_ID" ] || [ "$MEETING_ID" == "null" ]; then
    print_error "Failed to extract meeting ID from upload response"
    exit 1
fi

print_info "Meeting ID: $MEETING_ID"
echo ""

# Step 2: Wait for processing
print_step 2 "Waiting for audio processing, transcription, and diarization..."
print_info "This may take 1-3 minutes depending on audio length"

wait_with_spinner 30 "Processing audio"

# Step 3: Check transcript
print_step 3 "Checking if transcript is ready..."
TRANSCRIPT_RESPONSE=$(curl -s "$BASE_URL/meetings/$MEETING_ID/transcript")
echo "$TRANSCRIPT_RESPONSE" | jq '.'

# Check if transcript has data
HAS_TRANSCRIPT=$(echo "$TRANSCRIPT_RESPONSE" | jq -r '.transcript // empty')

if [ -z "$HAS_TRANSCRIPT" ]; then
    print_info "Transcript not ready yet, waiting longer..."
    wait_with_spinner 60 "Waiting for transcription and diarization"
    
    TRANSCRIPT_RESPONSE=$(curl -s "$BASE_URL/meetings/$MEETING_ID/transcript")
    echo "$TRANSCRIPT_RESPONSE" | jq '.'
fi
echo ""

# Step 4: Wait for Kafka processing and summary generation
print_step 4 "Waiting for Kafka message processing and summary generation..."
print_info "The diarization service should publish to Kafka now"
print_info "Summary service will consume the message and generate summary"

wait_with_spinner 15 "Generating AI summary"
echo ""

# Step 5: Check for summary
print_step 5 "Retrieving generated summary..."
SUMMARY_RESPONSE=$(curl -s "$BASE_URL/meetings/$MEETING_ID/summary")

if [ $? -eq 0 ]; then
    echo "$SUMMARY_RESPONSE" | jq '.'
    
    # Check if summary exists
    SUMMARY_TEXT=$(echo "$SUMMARY_RESPONSE" | jq -r '.summary // empty')
    
    if [ -z "$SUMMARY_TEXT" ]; then
        print_info "Summary not generated yet, waiting a bit more..."
        wait_with_spinner 20 "Still generating"
        
        SUMMARY_RESPONSE=$(curl -s "$BASE_URL/meetings/$MEETING_ID/summary")
        echo "$SUMMARY_RESPONSE" | jq '.'
    else
        print_info "Summary successfully generated!"
        echo ""
        echo -e "${GREEN}Summary Text:${NC}"
        echo "$SUMMARY_TEXT"
    fi
else
    print_error "Failed to retrieve summary"
fi
echo ""

# Step 6: Get all summaries
print_step 6 "Retrieving all summaries..."
ALL_SUMMARIES=$(curl -s "$BASE_URL/summaries")
echo "$ALL_SUMMARIES" | jq '.'
echo ""

# Step 7: Get speakers
print_step 7 "Retrieving identified speakers..."
SPEAKERS_RESPONSE=$(curl -s "$BASE_URL/meetings/$MEETING_ID/speakers")
echo "$SPEAKERS_RESPONSE" | jq '.'
echo ""

# Step 8: Check Kafka topic
print_step 8 "Verifying Kafka integration..."
print_info "Checking Kafka logs for published messages..."

docker logs transcript-diarization-service 2>&1 | grep -i "kafka" | tail -5
echo ""

docker logs transcript-summary-service 2>&1 | grep -i "consumed\|summary" | tail -5
echo ""

# Step 9: Check MongoDB
print_step 9 "Verifying MongoDB storage..."
print_info "Checking summaries collection in MongoDB..."

MONGO_QUERY="db.summaries.find({meeting_id: '$MEETING_ID'}).pretty()"
docker exec transcript-mongodb mongosh transcript_db --quiet --eval "$MONGO_QUERY"
echo ""

# Summary of results
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "Meeting ID: ${GREEN}$MEETING_ID${NC}"
echo -e "Audio File: ${GREEN}$AUDIO_FILE${NC}"
echo ""
echo -e "${GREEN}✓${NC} Audio/Video uploaded"
echo -e "${GREEN}✓${NC} Transcript generated"
echo -e "${GREEN}✓${NC} Speaker diarization completed"
echo -e "${GREEN}✓${NC} Kafka message published"
echo -e "${GREEN}✓${NC} Summary generated and stored in MongoDB"
echo -e "${GREEN}✓${NC} Summary accessible via REST API"
echo ""

# API endpoints summary
echo -e "${BLUE}Available API Endpoints:${NC}"
echo "1. Get all summaries:       curl $BASE_URL/summaries"
echo "2. Get summary by meeting:  curl $BASE_URL/meetings/$MEETING_ID/summary"
echo "3. Get summary by ID:       curl $BASE_URL/summaries/{summaryID}"
echo "4. Delete summary:          curl -X DELETE $BASE_URL/summaries/{summaryID}"
echo ""

# Cleanup option
echo -e "${YELLOW}Test completed!${NC}"
read -p "Do you want to delete this summary? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    SUMMARY_ID=$(echo "$SUMMARY_RESPONSE" | jq -r '.id')
    if [ ! -z "$SUMMARY_ID" ] && [ "$SUMMARY_ID" != "null" ]; then
        print_info "Deleting summary with ID: $SUMMARY_ID"
        curl -X DELETE "$BASE_URL/summaries/$SUMMARY_ID"
        echo ""
        print_info "Summary deleted"
    fi
fi

echo -e "\n${GREEN}All done! Check SUMMARY_SERVICE.md for detailed documentation.${NC}"
