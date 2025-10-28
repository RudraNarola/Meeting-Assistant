# Video Upload Support - Implementation Summary

## Changes Made

This document summarizes all the changes made to add video upload support with automatic audio extraction to the transcript generation system.

## Modified Files

### 1. `/services/audio-service/Dockerfile`

- **Change:** Added FFmpeg to Alpine Linux base image
- **Reason:** Required for audio extraction from video files
- **Line:** `RUN apk --no-cache add ca-certificates ffmpeg`

### 2. `/pkg/models/models.go`

- **Changes:**
  - Added `VideoID *uuid.UUID` field to `AudioFile` struct
  - Created new `VideoFile` struct
- **Reason:** Support linking between video files and extracted audio files

### 3. `/services/audio-service/internal/repository/repository.go`

- **Changes:**
  - Updated `CreateAudioFile()` to include `video_id` parameter
  - Updated `GetAudioFilesByMeetingID()` to retrieve `video_id`
  - Updated `GetAudioFileByID()` to retrieve `video_id`
  - Added `CreateVideoFile()` method
  - Added `GetVideoFilesByMeetingID()` method
- **Reason:** Database operations for video file management

### 4. `/services/audio-service/internal/service/service.go`

- **Changes:**
  - Added import for internal utils package
  - Updated `SaveAudioFile()` to set `VideoID` field and use FFmpeg for duration
  - Added `SaveVideoFile()` method for complete video processing workflow
  - Added `GetVideoFiles()` method
- **Reason:** Business logic for video upload and audio extraction

### 5. `/services/audio-service/internal/handlers/handlers.go`

- **Changes:**
  - Added import for file utils
  - Updated `UploadAudio()` to detect and handle both audio and video files
  - Added `GetVideoFiles()` handler
- **Reason:** HTTP endpoint handling for video operations

### 6. `/services/audio-service/cmd/main.go`

- **Changes:**
  - Added route: `GET /meetings/{meetingID}/videos`
- **Reason:** Expose video file retrieval endpoint

### 7. `/scripts/init-db.sql`

- **Changes:**
  - Added `video_id` column to `audio_files` table
  - Created `video_files` table
  - Added indexes for video-related queries
- **Reason:** Database schema to support video storage and relationships

### 8. `/README.md`

- **Changes:**
  - Updated features to mention video support
  - Updated audio service description
  - Added video upload examples
  - Listed supported video and audio formats
- **Reason:** Documentation for users

## New Files Created

### 1. `/services/audio-service/internal/utils/ffmpeg.go`

- **Purpose:** FFmpeg utility functions
- **Functions:**
  - `ExtractAudioFromVideo()` - Extract audio from video using FFmpeg
  - `GetAudioDuration()` - Get duration of audio/video file using FFprobe
  - `GetVideoResolution()` - Get video resolution
  - `IsVideoFile()` - Check if file is video based on extension
  - `IsAudioFile()` - Check if file is audio based on extension

### 2. `/scripts/add-video-support.sql`

- **Purpose:** Migration script for existing databases
- **Contents:**
  - Adds `video_id` column to `audio_files` table
  - Creates `video_files` table
  - Adds necessary indexes and foreign keys

### 3. `/docs/VIDEO_UPLOAD_SUPPORT.md`

- **Purpose:** Comprehensive documentation for video upload feature
- **Contents:**
  - Overview and supported formats
  - API usage examples
  - Database schema details
  - Audio extraction configuration
  - Docker setup
  - Testing guide
  - Troubleshooting
  - Future enhancements

### 4. `/test_video_upload.sh`

- **Purpose:** Test script for video upload functionality
- **Features:**
  - Health check
  - Video upload test
  - Audio files retrieval
  - Video files retrieval
  - JSON formatted output

### 5. `/upload_video.sh`

- **Purpose:** Complete demo workflow script
- **Features:**
  - Step-by-step video upload process
  - Status checking with polling
  - Transcript retrieval
  - Colored console output
  - Summary and next steps

### 6. `/VIDEO_QUICK_START.md`

- **Purpose:** Quick reference guide for video uploads
- **Contents:**
  - Quick commands
  - Supported formats
  - Test scripts
  - How it works
  - Troubleshooting tips

## Database Schema Changes

### New Table: `video_files`

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

### Modified Table: `audio_files`

- Added column: `video_id UUID` (nullable, references `video_files(id)`)

### New Indexes

- `idx_audio_files_video` on `audio_files(video_id)`
- `idx_video_files_meeting` on `video_files(meeting_id)`

## Workflow

### Video Upload Flow

1. Client uploads video file via `POST /upload`
2. Handler detects video format using file extension
3. Service saves video file to storage
4. FFmpeg extracts audio to WAV format (16kHz, mono, PCM)
5. Video metadata extracted (duration, resolution)
6. Audio metadata extracted (duration)
7. Database records created for both video and audio
8. Message published to `transcription_processing` queue
9. Same transcription workflow as audio uploads

### Key Design Decisions

1. **Synchronous Processing:** Audio extraction happens during upload request

   - Pro: Simpler implementation
   - Con: Longer upload time for large videos
   - Future: Could move to async background job

2. **Audio Format:** WAV with 16kHz, mono, PCM

   - Optimized for speech recognition
   - Higher quality for Whisper transcription
   - Larger file size but better accuracy

3. **File Storage:** Original video kept alongside extracted audio

   - Allows future re-processing with different settings
   - Useful for debugging
   - Could be deleted after successful transcription if storage is limited

4. **Database Linking:** Bidirectional references between video and audio
   - `video_files.audio_file_id` → extracted audio
   - `audio_files.video_id` → source video (nullable)
   - Easy navigation in both directions

## Supported Formats

### Video Formats

- MP4, AVI, MOV, MKV, WebM, FLV, WMV, M4V, MPEG

### Audio Formats

- MP3, WAV, M4A, AAC, OGG, FLAC, WMA, Opus, WebM

## API Changes

### New/Updated Endpoints

#### `POST /upload` (Updated)

- Now accepts both audio and video files
- Field name: `audio` or `file`
- Automatically detects file type
- Returns different response for video vs audio

#### `GET /meetings/{meetingID}/videos` (New)

- Returns all video files for a meeting
- Includes video metadata and link to extracted audio

## Testing

Three test scripts provided:

1. **test_video_upload.sh** - Simple upload test
2. **upload_video.sh** - Complete workflow demo
3. **test_app.sh** - Existing test (still works)

## Dependencies

### New Runtime Dependency

- **FFmpeg** - Added to Docker container
- Includes: `ffmpeg` and `ffprobe` binaries
- No Go library dependencies added

## Deployment Notes

### For New Deployments

1. Use updated `docker-compose.yml`
2. Database schema includes video support automatically

### For Existing Deployments

1. Rebuild audio-service Docker image
2. Run migration: `scripts/add-video-support.sql`
3. Restart audio-service

### Migration Command

```bash
# Using Docker
docker exec -i postgres psql -U transcript_user -d transcript_db < scripts/add-video-support.sql

# Or rebuild from scratch
docker-compose down -v
docker-compose up -d
```

## Performance Considerations

### Audio Extraction Time

- Approximate: 1 minute video = 2-5 seconds extraction
- Depends on: CPU, video codec, file size

### Storage Requirements

- Video: Original size
- Extracted audio: ~10MB per minute (WAV format)
- Total: Original video size + audio size

### Memory Usage

- FFmpeg process: ~100-200MB during extraction
- Ensure adequate Docker memory limits

## Future Enhancements

1. **Async Processing**

   - Move extraction to background worker
   - Return immediately, notify on completion

2. **Compression**

   - Option to store compressed audio (MP3/AAC)
   - Trade-off: storage vs. transcription quality

3. **Video Processing**

   - Extract thumbnails
   - Generate preview clips
   - Multiple audio tracks support

4. **Cleanup**

   - Option to delete video after extraction
   - Configurable retention policies

5. **Progress Tracking**
   - Real-time extraction progress
   - WebSocket updates to client

## Security Considerations

1. **File Type Validation**

   - Currently validates by extension
   - Consider adding MIME type validation
   - Add file content verification

2. **File Size Limits**

   - Currently: 500MB max
   - Adjust based on requirements
   - Add per-user quotas if needed

3. **Storage Isolation**
   - Files stored with UUID names
   - Prevents path traversal attacks
   - Consider adding user-based directories

## Compatibility

- ✅ Backward compatible with existing audio uploads
- ✅ Existing API endpoints unchanged
- ✅ Database migration preserves existing data
- ✅ Old clients continue to work without changes

## Conclusion

The video upload feature has been successfully integrated with minimal changes to the existing architecture. The implementation:

- ✅ Maintains backward compatibility
- ✅ Follows existing patterns and conventions
- ✅ Includes comprehensive documentation
- ✅ Provides testing tools
- ✅ Supports easy migration for existing deployments

All changes are production-ready and tested with the existing workflow.
