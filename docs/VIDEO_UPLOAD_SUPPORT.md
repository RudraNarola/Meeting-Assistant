# Video Upload Support Documentation

## Overview

The audio service now supports video file uploads with automatic audio extraction. When a video file is uploaded, the service automatically:

1. Saves the original video file
2. Extracts audio from the video using FFmpeg
3. Processes the extracted audio through the same transcription workflow
4. Links the video and extracted audio files in the database

## Supported Formats

### Video Formats

- MP4 (.mp4)
- AVI (.avi)
- MOV (.mov)
- MKV (.mkv)
- WebM (.webm)
- FLV (.flv)
- WMV (.wmv)
- M4V (.m4v)
- MPEG (.mpeg, .mpg)

### Audio Formats

- MP3 (.mp3)
- WAV (.wav)
- M4A (.m4a)
- AAC (.aac)
- OGG (.ogg)
- FLAC (.flac)
- WMA (.wma)
- Opus (.opus)
- WebM (.webm)

## API Usage

### Upload Video or Audio

**Endpoint:** `POST /upload`

**Form Data:**

- `file` or `audio`: The audio/video file (multipart/form-data)
- `meeting_id` (optional): UUID of existing meeting
- `title` (optional): Meeting title (used if creating new meeting)
- `platform` (optional): Platform name (e.g., "google_meet", "zoom")

**Example using cURL:**

```bash
# Upload a video file
curl -X POST http://localhost:8081/upload \
  -F "file=@/path/to/video.mp4" \
  -F "title=Team Meeting" \
  -F "platform=zoom"

# Upload an audio file
curl -X POST http://localhost:8081/upload \
  -F "audio=@/path/to/audio.mp3" \
  -F "title=Team Meeting"
```

**Response for Video Upload:**

```json
{
  "message": "Video uploaded and audio extracted successfully",
  "data": {
    "meeting_id": "uuid-here",
    "video_file": {
      "id": "uuid-here",
      "meeting_id": "uuid-here",
      "filename": "video.mp4",
      "file_path": "/app/storage/uuid.mp4",
      "file_size": 10485760,
      "duration": 180.5,
      "format": "mp4",
      "resolution": "1920x1080",
      "uploaded_at": "2025-10-28T10:00:00Z",
      "audio_file_id": "audio-uuid-here"
    },
    "audio_file": {
      "id": "audio-uuid-here",
      "meeting_id": "uuid-here",
      "video_id": "uuid-here",
      "filename": "video.mp4.wav",
      "file_path": "/app/storage/uuid.wav",
      "file_size": 5242880,
      "duration": 180.5,
      "format": "wav",
      "uploaded_at": "2025-10-28T10:00:00Z",
      "processed": false
    },
    "message": "Audio has been extracted from video and queued for transcription"
  }
}
```

### Get Video Files for a Meeting

**Endpoint:** `GET /meetings/{meetingID}/videos`

**Example:**

```bash
curl http://localhost:8081/meetings/uuid-here/videos
```

**Response:**

```json
{
  "meeting": {
    "id": "uuid-here",
    "title": "Team Meeting",
    "platform": "zoom",
    "created_at": "2025-10-28T10:00:00Z",
    "updated_at": "2025-10-28T10:00:00Z",
    "status": "processing"
  },
  "video_files": [
    {
      "id": "uuid-here",
      "meeting_id": "uuid-here",
      "filename": "video.mp4",
      "file_path": "/app/storage/uuid.mp4",
      "file_size": 10485760,
      "duration": 180.5,
      "format": "mp4",
      "resolution": "1920x1080",
      "uploaded_at": "2025-10-28T10:00:00Z",
      "audio_file_id": "audio-uuid-here"
    }
  ]
}
```

## Database Schema

### video_files Table

```sql
CREATE TABLE video_files (
    id UUID PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    duration FLOAT,
    format VARCHAR(50),
    resolution VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    audio_file_id UUID REFERENCES audio_files(id) ON DELETE SET NULL
);
```

### Updated audio_files Table

```sql
CREATE TABLE audio_files (
    id UUID PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    video_id UUID REFERENCES video_files(id), -- NEW: Link to source video
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    duration FLOAT,
    format VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE
);
```

## Audio Extraction Details

### FFmpeg Configuration

The audio extraction uses FFmpeg with the following settings optimized for speech recognition:

- **Output Format:** WAV (PCM)
- **Audio Codec:** pcm_s16le (16-bit PCM)
- **Sample Rate:** 16kHz (optimal for speech recognition)
- **Channels:** Mono (1 channel)

**FFmpeg Command:**

```bash
ffmpeg -i input_video.mp4 \
  -vn \
  -acodec pcm_s16le \
  -ar 16000 \
  -ac 1 \
  -y output_audio.wav
```

### Metadata Extraction

The service automatically extracts:

- **Video Duration:** Using FFprobe
- **Video Resolution:** Width x Height (e.g., "1920x1080")
- **Audio Duration:** From extracted audio file

## Docker Configuration

The Dockerfile has been updated to include FFmpeg:

```dockerfile
FROM alpine:latest
RUN apk --no-cache add ca-certificates ffmpeg
```

FFmpeg and FFprobe are required for:

- Audio extraction from video files
- Duration calculation for audio/video files
- Resolution detection for video files

## Migration

If you have an existing database, run the migration script:

```bash
psql -h localhost -U transcript_user -d transcript_db -f scripts/add-video-support.sql
```

Or using Docker:

```bash
docker exec -i postgres psql -U transcript_user -d transcript_db < scripts/add-video-support.sql
```

## Workflow

1. **Video Upload**

   - User uploads video file via POST /upload
   - Service detects video format based on file extension
   - Video file is saved to storage

2. **Audio Extraction**

   - FFmpeg extracts audio from video
   - Audio is converted to 16kHz mono WAV
   - Duration and metadata are calculated

3. **Database Records**

   - Video file record created in `video_files` table
   - Audio file record created in `audio_files` table with `video_id` reference
   - Both records linked via `audio_file_id` in video record

4. **Transcription Processing**
   - Message published to `transcription_processing` queue
   - Extracted audio file path sent to transcription service
   - Same workflow as direct audio upload

## Testing

### Test Video Upload

Create a test script:

```bash
#!/bin/bash
# test_video_upload.sh

AUDIO_SERVICE_URL="http://localhost:8081"

# Upload video file
echo "Uploading video file..."
curl -X POST $AUDIO_SERVICE_URL/upload \
  -F "file=@test_video.mp4" \
  -F "title=Test Video Meeting" \
  -F "platform=zoom" \
  -v

# Extract meeting ID from response and get video files
MEETING_ID="your-meeting-id-here"
echo "Getting video files..."
curl $AUDIO_SERVICE_URL/meetings/$MEETING_ID/videos
```

### Test with Different Formats

```bash
# Test MP4
curl -X POST http://localhost:8081/upload -F "file=@test.mp4"

# Test AVI
curl -X POST http://localhost:8081/upload -F "file=@test.avi"

# Test MOV
curl -X POST http://localhost:8081/upload -F "file=@test.mov"

# Test audio (should still work)
curl -X POST http://localhost:8081/upload -F "audio=@test.mp3"
```

## Error Handling

The service handles various error scenarios:

1. **Invalid File Type**

   - Returns 400 error if file is neither audio nor video

2. **FFmpeg Failure**

   - Returns 500 error with FFmpeg output
   - Cleans up uploaded video file

3. **Database Failure**

   - Cleans up both video and audio files
   - Returns appropriate error message

4. **Missing Meeting**
   - Creates new meeting if `meeting_id` not provided
   - Returns 404 if provided `meeting_id` doesn't exist

## Performance Considerations

### File Size Limits

- Maximum upload size: 500MB
- Configurable via `ParseMultipartForm(500 << 20)`

### Storage Requirements

- Videos stored in original format
- Extracted audio stored as WAV (larger than compressed formats)
- Example: 100MB MP4 video → ~50MB WAV audio

### Processing Time

- Audio extraction time depends on video length
- Approximate: 1 minute video = 2-5 seconds extraction time
- Runs synchronously during upload request

## Future Enhancements

1. **Asynchronous Processing**

   - Move audio extraction to background job
   - Return immediately after video upload
   - Notify when extraction complete

2. **Format Options**

   - Allow client to specify output audio format
   - Support compressed formats (MP3, AAC) for storage efficiency

3. **Video Thumbnails**

   - Extract thumbnail/preview image from video
   - Store for UI display

4. **Multiple Audio Tracks**

   - Detect and extract specific audio track
   - Support multi-language videos

5. **Cleanup Job**
   - Optionally delete video after audio extraction
   - Configurable retention policy

## Troubleshooting

### FFmpeg Not Found

```
Error: ffmpeg failed: exec: "ffmpeg": executable file not found
```

**Solution:** Ensure FFmpeg is installed in Docker container. Rebuild image if needed.

### Permission Denied

```
Error: failed to create file: permission denied
```

**Solution:** Check storage directory permissions. Ensure write access to `/app/storage`.

### Out of Memory

```
Error: signal: killed
```

**Solution:** Increase Docker container memory limit for large video files.

### Slow Extraction

**Solution:**

- Use faster storage (SSD)
- Increase CPU allocation
- Consider async processing for large files
