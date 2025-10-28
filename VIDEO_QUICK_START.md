# Video Upload Quick Start Guide

## Overview

Your transcript generation system now supports both audio and video uploads! When you upload a video, the system automatically:

1. ✅ Saves the video file
2. ✅ Extracts audio using FFmpeg
3. ✅ Sends audio for transcription
4. ✅ Processes through the same workflow as audio files

## Quick Commands

### Upload a Video

```bash
curl -X POST http://localhost:8080/api/v1/meetings/upload \
  -F "file=@/path/to/video.mp4" \
  -F "title=My Meeting" \
  -F "platform=zoom"
```

### Upload Audio (Still Works!)

```bash
curl -X POST http://localhost:8080/api/v1/meetings/upload \
  -F "audio=@/path/to/audio.mp3" \
  -F "title=My Meeting" \
  -F "platform=zoom"
```

### Get Video Files for a Meeting

```bash
curl http://localhost:8081/meetings/{meeting-id}/videos
```

### Get Audio Files for a Meeting

```bash
curl http://localhost:8081/meetings/{meeting-id}/audio
```

## Supported Video Formats

✅ MP4, AVI, MOV, MKV, WebM, FLV, WMV, M4V, MPEG

## Supported Audio Formats

✅ MP3, WAV, M4A, AAC, OGG, FLAC, WMA, Opus, WebM

## Test Scripts

Three test scripts are available:

### 1. Simple Video Upload Test

```bash
./test_video_upload.sh /path/to/video.mp4
```

### 2. Complete Demo Workflow

```bash
./upload_video.sh /path/to/video.mp4
```

Shows the entire process from upload to transcript retrieval.

### 3. Test with Generated Video

If you don't have a test video, create one:

```bash
# Create a 10-second test video
ffmpeg -f lavfi -i testsrc=duration=10:size=1280x720:rate=1 \
  -f lavfi -i sine=frequency=1000:duration=10 test_video.mp4

# Upload it
./upload_video.sh test_video.mp4
```

## Database Changes

New tables and columns have been added:

### video_files Table

Stores video file metadata including resolution, format, and link to extracted audio.

### audio_files.video_id Column

Links audio files back to their source video (if extracted from video).

## Migration

If you have an existing database, run:

```bash
# Using psql
psql -h localhost -U transcript_user -d transcript_db -f scripts/add-video-support.sql

# Using Docker
docker exec -i postgres psql -U transcript_user -d transcript_db < scripts/add-video-support.sql
```

## How It Works

```
Video Upload → Save Video → Extract Audio → Queue for Transcription → Same Workflow
     ↓              ↓              ↓                    ↓
 [video.mp4]  [DB Record]  [audio.wav]        [RabbitMQ Message]
```

## Audio Extraction Settings

Videos are converted to audio with settings optimized for speech recognition:

- **Format:** WAV (uncompressed)
- **Sample Rate:** 16kHz
- **Channels:** Mono
- **Codec:** PCM 16-bit

These settings provide the best quality for Whisper transcription.

## Response Example

When uploading a video:

```json
{
  "message": "Video uploaded and audio extracted successfully",
  "data": {
    "meeting_id": "550e8400-e29b-41d4-a716-446655440000",
    "video_file": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "filename": "meeting.mp4",
      "file_size": 10485760,
      "duration": 180.5,
      "format": "mp4",
      "resolution": "1920x1080"
    },
    "audio_file": {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "video_id": "660e8400-e29b-41d4-a716-446655440000",
      "filename": "meeting.mp4.wav",
      "duration": 180.5,
      "format": "wav"
    }
  }
}
```

## Troubleshooting

### "ffmpeg: not found" error

**Solution:** Rebuild the audio-service Docker image:

```bash
docker-compose build audio-service
docker-compose up -d audio-service
```

### Large video taking too long

Audio extraction happens synchronously during upload. For large videos:

1. Consider implementing async processing (future enhancement)
2. Increase Docker memory limits
3. Use faster storage (SSD)

### Video uploaded but no audio extracted

Check logs:

```bash
docker-compose logs audio-service
```

Look for FFmpeg errors and ensure video file is not corrupted.

## Full Documentation

For complete details, see: `docs/VIDEO_UPLOAD_SUPPORT.md`

## What's Next?

After uploading a video:

1. ✅ Audio is automatically extracted
2. ✅ Transcription begins immediately
3. ✅ Check status: `GET /api/v1/meetings/{id}/status`
4. ✅ Get transcript: `GET /api/v1/meetings/{id}/transcript`
5. ✅ Update speakers: `PUT /api/v1/speakers/{id}`

Everything works exactly the same as audio uploads!
