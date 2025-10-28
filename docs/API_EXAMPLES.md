# API Examples

This document contains complete examples for using the Meeting Transcript Generator API.

## Table of Contents

- [Authentication](#authentication)
- [Upload Meeting Audio](#upload-meeting-audio)
- [Check Processing Status](#check-processing-status)
- [Get Full Transcript](#get-full-transcript)
- [Update Speaker Names](#update-speaker-names)
- [Complete Workflow Example](#complete-workflow-example)

## Authentication

Currently, the API doesn't require authentication. In production, add API keys or JWT tokens.

## Upload Meeting Audio

### Request

```bash
curl -X POST http://localhost:8080/api/v1/meetings/upload \
  -F "audio=@meeting-recording.mp3" \
  -F "title=Weekly Team Standup" \
  -F "platform=zoom"
```

### Response

```json
{
  "message": "Audio uploaded successfully",
  "data": {
    "meeting_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "audio_file": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "meeting_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "filename": "meeting-recording.mp3",
      "file_path": "/app/storage/a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp3",
      "file_size": 15728640,
      "duration": 0,
      "format": "mp3",
      "uploaded_at": "2025-10-28T10:00:00Z",
      "processed": false
    }
  }
}
```

## Check Processing Status

### Request

```bash
curl http://localhost:8080/api/v1/meetings/f47ac10b-58cc-4372-a567-0e02b2c3d479/status
```

### Response

```json
{
  "meeting_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "completed",
  "title": "Weekly Team Standup",
  "platform": "zoom",
  "created_at": "2025-10-28T10:00:00Z",
  "updated_at": "2025-10-28T10:05:30Z"
}
```

### Status Values

- `pending`: Initial state after upload
- `processing`: Transcription and diarization in progress
- `completed`: All processing complete, transcript ready
- `failed`: Error occurred during processing

## Get Full Transcript

### Request

```bash
curl http://localhost:8080/api/v1/meetings/f47ac10b-58cc-4372-a567-0e02b2c3d479/transcript
```

### Response

```json
{
  "meeting": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "title": "Weekly Team Standup",
    "platform": "zoom",
    "created_at": "2025-10-28T10:00:00Z",
    "updated_at": "2025-10-28T10:05:30Z",
    "status": "completed"
  },
  "speakers": [
    {
      "id": "speaker-uuid-1",
      "meeting_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "",
      "label": "Speaker 1",
      "created_at": "2025-10-28T10:05:00Z"
    },
    {
      "id": "speaker-uuid-2",
      "meeting_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "",
      "label": "Speaker 2",
      "created_at": "2025-10-28T10:05:00Z"
    }
  ],
  "segments": [
    {
      "id": "segment-uuid-1",
      "transcription_id": "transcription-uuid",
      "speaker_id": "speaker-uuid-1",
      "speaker_name": "Speaker 1",
      "text": "Hello everyone, thank you for joining today's meeting.",
      "start_time": 0.0,
      "end_time": 4.5,
      "confidence": 0.95,
      "sequence_number": 1,
      "created_at": "2025-10-28T10:05:00Z"
    },
    {
      "id": "segment-uuid-2",
      "transcription_id": "transcription-uuid",
      "speaker_id": "speaker-uuid-2",
      "speaker_name": "Speaker 2",
      "text": "Good morning. I'd like to share an update on the project.",
      "start_time": 4.5,
      "end_time": 9.2,
      "confidence": 0.93,
      "sequence_number": 2,
      "created_at": "2025-10-28T10:05:00Z"
    }
  ],
  "full_text": "Hello everyone, thank you for joining today's meeting. Good morning. I'd like to share an update on the project...",
  "duration": 900.5,
  "created_at": "2025-10-28T10:02:00Z"
}
```

## Update Speaker Names

After getting the transcript, you can assign names to speakers:

### Request

```bash
curl -X PUT http://localhost:8080/api/v1/speakers/speaker-uuid-1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson"
  }'
```

### Response

```json
{
  "message": "Speaker updated successfully",
  "data": {
    "id": "speaker-uuid-1",
    "meeting_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Alice Johnson",
    "label": "Speaker 1",
    "created_at": "2025-10-28T10:05:00Z"
  }
}
```

## Complete Workflow Example

Here's a complete bash script showing the entire workflow:

```bash
#!/bin/bash

API_BASE="http://localhost:8080/api/v1"

# 1. Upload audio file
echo "Uploading audio file..."
UPLOAD_RESPONSE=$(curl -s -X POST $API_BASE/meetings/upload \
  -F "audio=@meeting.mp3" \
  -F "title=Product Planning Meeting" \
  -F "platform=google_meet")

echo "$UPLOAD_RESPONSE" | jq .

# Extract meeting ID
MEETING_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.meeting_id')
echo "Meeting ID: $MEETING_ID"

# 2. Wait for processing (check status every 5 seconds)
echo "Waiting for processing to complete..."
while true; do
  STATUS_RESPONSE=$(curl -s $API_BASE/meetings/$MEETING_ID/status)
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')

  echo "Current status: $STATUS"

  if [ "$STATUS" = "completed" ]; then
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "Processing failed!"
    exit 1
  fi

  sleep 5
done

# 3. Get full transcript
echo "Fetching transcript..."
TRANSCRIPT_RESPONSE=$(curl -s $API_BASE/meetings/$MEETING_ID/transcript)
echo "$TRANSCRIPT_RESPONSE" | jq .

# 4. Extract speaker IDs
SPEAKER_1_ID=$(echo "$TRANSCRIPT_RESPONSE" | jq -r '.speakers[0].id')
SPEAKER_2_ID=$(echo "$TRANSCRIPT_RESPONSE" | jq -r '.speakers[1].id')

# 5. Update speaker names
echo "Updating speaker names..."
curl -s -X PUT $API_BASE/speakers/$SPEAKER_1_ID \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Johnson"}' | jq .

curl -s -X PUT $API_BASE/speakers/$SPEAKER_2_ID \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob Smith"}' | jq .

# 6. Get updated transcript
echo "Fetching updated transcript..."
FINAL_TRANSCRIPT=$(curl -s $API_BASE/meetings/$MEETING_ID/transcript)
echo "$FINAL_TRANSCRIPT" | jq .

# 7. Save to file
echo "$FINAL_TRANSCRIPT" > transcript_$MEETING_ID.json
echo "Transcript saved to transcript_$MEETING_ID.json"

# 8. Generate readable text output
echo "Generating readable transcript..."
echo "$FINAL_TRANSCRIPT" | jq -r '
  "Meeting: \(.meeting.title)",
  "Platform: \(.meeting.platform)",
  "Date: \(.created_at)",
  "Duration: \(.duration) seconds",
  "",
  "=== TRANSCRIPT ===",
  "",
  (.segments[] | "[\(.start_time)s] \(.speaker_name): \(.text)")
' > readable_transcript_$MEETING_ID.txt

echo "Readable transcript saved to readable_transcript_$MEETING_ID.txt"
```

### Save this as `test_api.sh` and run:

```bash
chmod +x test_api.sh
./test_api.sh
```

## Python Example

Here's a Python version using the `requests` library:

```python
import requests
import time
import json

API_BASE = "http://localhost:8080/api/v1"

def upload_audio(file_path, title, platform):
    """Upload audio file to the API"""
    with open(file_path, 'rb') as f:
        files = {'audio': f}
        data = {
            'title': title,
            'platform': platform
        }
        response = requests.post(f"{API_BASE}/meetings/upload", files=files, data=data)
        return response.json()

def get_meeting_status(meeting_id):
    """Get meeting processing status"""
    response = requests.get(f"{API_BASE}/meetings/{meeting_id}/status")
    return response.json()

def get_transcript(meeting_id):
    """Get full transcript with speakers"""
    response = requests.get(f"{API_BASE}/meetings/{meeting_id}/transcript")
    return response.json()

def update_speaker(speaker_id, name):
    """Update speaker name"""
    data = {'name': name}
    response = requests.put(f"{API_BASE}/speakers/{speaker_id}", json=data)
    return response.json()

def wait_for_completion(meeting_id, max_wait=300):
    """Wait for processing to complete"""
    start_time = time.time()
    while time.time() - start_time < max_wait:
        status_data = get_meeting_status(meeting_id)
        status = status_data['status']

        print(f"Current status: {status}")

        if status == 'completed':
            return True
        elif status == 'failed':
            print("Processing failed!")
            return False

        time.sleep(5)

    print("Timeout waiting for processing")
    return False

def main():
    # 1. Upload audio
    print("Uploading audio...")
    upload_result = upload_audio(
        'meeting.mp3',
        'Product Planning Meeting',
        'google_meet'
    )

    meeting_id = upload_result['data']['meeting_id']
    print(f"Meeting ID: {meeting_id}")

    # 2. Wait for processing
    print("Waiting for processing...")
    if not wait_for_completion(meeting_id):
        return

    # 3. Get transcript
    print("Fetching transcript...")
    transcript = get_transcript(meeting_id)

    # 4. Update speaker names
    speakers = transcript['speakers']
    speaker_names = {
        0: 'Alice Johnson',
        1: 'Bob Smith',
        2: 'Charlie Davis'
    }

    for i, speaker in enumerate(speakers):
        if i in speaker_names:
            print(f"Updating {speaker['label']} to {speaker_names[i]}")
            update_speaker(speaker['id'], speaker_names[i])

    # 5. Get final transcript
    print("Fetching final transcript...")
    final_transcript = get_transcript(meeting_id)

    # 6. Save to file
    with open(f'transcript_{meeting_id}.json', 'w') as f:
        json.dump(final_transcript, f, indent=2)

    # 7. Generate readable output
    print("\n=== TRANSCRIPT ===\n")
    for segment in final_transcript['segments']:
        print(f"[{segment['start_time']:.1f}s] {segment['speaker_name']}: {segment['text']}")

if __name__ == '__main__':
    main()
```

## Error Handling

All errors return JSON with this format:

```json
{
  "error": "Bad Request",
  "message": "Invalid meeting ID",
  "code": 400
}
```

### Common HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid input
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error
- `502 Bad Gateway`: Microservice unavailable
