# Video Upload Feature - Deployment Checklist

## Pre-Deployment Verification

### 1. Code Changes ✓

- [x] Updated Dockerfile with FFmpeg
- [x] Added VideoFile model
- [x] Updated AudioFile model with video_id
- [x] Created FFmpeg utility functions
- [x] Updated repository methods
- [x] Updated service methods
- [x] Updated handlers
- [x] Added new route for video files
- [x] Updated database schema

### 2. Documentation ✓

- [x] Updated README.md
- [x] Created VIDEO_UPLOAD_SUPPORT.md
- [x] Created VIDEO_QUICK_START.md
- [x] Created IMPLEMENTATION_SUMMARY.md
- [x] Created test scripts

### 3. Database Migration ✓

- [x] Created migration script (add-video-support.sql)
- [x] Updated init-db.sql for new installations

## Deployment Steps

### For New Installations

1. **Pull Latest Code**

   ```bash
   git pull origin main
   ```

2. **Build and Start Services**

   ```bash
   docker-compose build
   docker-compose up -d
   ```

3. **Verify Services**

   ```bash
   docker-compose ps
   curl http://localhost:8080/health
   curl http://localhost:8081/health
   ```

4. **Test Video Upload**
   ```bash
   ./test_video_upload.sh your_test_video.mp4
   ```

### For Existing Installations

1. **Backup Database** ⚠️ IMPORTANT

   ```bash
   docker exec postgres pg_dump -U transcript_user transcript_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Pull Latest Code**

   ```bash
   git pull origin main
   ```

3. **Run Database Migration**

   ```bash
   docker exec -i postgres psql -U transcript_user -d transcript_db < scripts/add-video-support.sql
   ```

4. **Rebuild Audio Service**

   ```bash
   docker-compose build audio-service
   ```

5. **Restart Services**

   ```bash
   docker-compose down
   docker-compose up -d
   ```

6. **Verify Migration**

   ```bash
   docker exec -i postgres psql -U transcript_user -d transcript_db -c "\d video_files"
   docker exec -i postgres psql -U transcript_user -d transcript_db -c "\d audio_files"
   ```

7. **Test Backward Compatibility**

   ```bash
   # Test audio upload still works
   ./test_app.sh sample_audio.mp3
   ```

8. **Test New Video Feature**
   ```bash
   # Test video upload
   ./test_video_upload.sh test_video.mp4
   ```

## Post-Deployment Verification

### 1. Service Health Checks

```bash
# All services should be running
docker-compose ps

# Health endpoints should respond
curl http://localhost:8080/health
curl http://localhost:8081/health
curl http://localhost:8082/health
curl http://localhost:8083/health
curl http://localhost:8084/health
```

Expected: All return "healthy" status

### 2. FFmpeg Availability

```bash
docker exec audio-service which ffmpeg
docker exec audio-service which ffprobe
```

Expected: Both commands return paths (e.g., `/usr/bin/ffmpeg`)

### 3. Database Schema

```bash
docker exec -i postgres psql -U transcript_user -d transcript_db << EOF
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name IN ('video_files', 'audio_files');
EOF
```

Expected: Both `video_files` and `audio_files` tables exist

### 4. Test Audio Upload (Existing Feature)

```bash
curl -X POST http://localhost:8080/api/v1/meetings/upload \
  -F "audio=@test_audio.mp3" \
  -F "title=Test Audio" \
  -F "platform=zoom"
```

Expected: Success response with meeting_id

### 5. Test Video Upload (New Feature)

```bash
curl -X POST http://localhost:8080/api/v1/meetings/upload \
  -F "file=@test_video.mp4" \
  -F "title=Test Video" \
  -F "platform=zoom"
```

Expected: Success response with both video_file and audio_file data

### 6. Verify Audio Extraction

```bash
# Check logs for FFmpeg execution
docker-compose logs audio-service | grep ffmpeg
```

Expected: FFmpeg command logs showing successful audio extraction

### 7. End-to-End Test

```bash
# Run complete workflow test
./upload_video.sh test_video.mp4
```

Expected: Complete workflow from upload to transcript retrieval

## Rollback Plan

If issues occur, rollback using these steps:

### 1. Stop Services

```bash
docker-compose down
```

### 2. Restore Database

```bash
docker-compose up -d postgres
docker exec -i postgres psql -U transcript_user -d transcript_db < backup_YYYYMMDD_HHMMSS.sql
```

### 3. Checkout Previous Version

```bash
git checkout <previous-commit-hash>
```

### 4. Rebuild and Restart

```bash
docker-compose build
docker-compose up -d
```

## Monitoring

### Key Metrics to Watch

1. **Upload Response Time**

   - Video uploads will take longer due to audio extraction
   - Monitor for timeouts (default 500MB limit)

2. **Storage Usage**

   - Videos + extracted audio consume more space
   - Monitor `/app/storage` directory size

3. **Memory Usage**

   - FFmpeg processes use ~100-200MB during extraction
   - Monitor Docker container memory

4. **Error Rates**
   - Check logs for FFmpeg failures
   - Monitor database connection issues

### Log Commands

```bash
# Watch all logs
docker-compose logs -f

# Watch audio service logs
docker-compose logs -f audio-service

# Check for errors
docker-compose logs audio-service | grep -i error
docker-compose logs audio-service | grep -i failed
```

## Troubleshooting

### Issue: FFmpeg not found

```bash
# Check FFmpeg installation
docker exec audio-service ffmpeg -version

# If missing, rebuild container
docker-compose build audio-service --no-cache
docker-compose up -d audio-service
```

### Issue: Database migration failed

```bash
# Check current schema
docker exec -i postgres psql -U transcript_user -d transcript_db -c "\d"

# Rerun migration
docker exec -i postgres psql -U transcript_user -d transcript_db < scripts/add-video-support.sql
```

### Issue: Video upload fails

```bash
# Check logs
docker-compose logs audio-service | tail -50

# Verify storage permissions
docker exec audio-service ls -la /app/storage
```

### Issue: Large video timeout

```bash
# Increase upload size limit in nginx/proxy if used
# Or increase Docker timeout settings
```

## Success Criteria

- [x] All services start without errors
- [x] Audio uploads continue to work (backward compatibility)
- [x] Video uploads work and extract audio
- [x] Extracted audio is queued for transcription
- [x] Database contains both video_files and audio_files records
- [x] FFmpeg is available in audio-service container
- [x] No regression in existing functionality
- [x] Test scripts run successfully

## Support & Documentation

After deployment, ensure team has access to:

1. **VIDEO_QUICK_START.md** - Quick reference for using video uploads
2. **VIDEO_UPLOAD_SUPPORT.md** - Comprehensive documentation
3. **IMPLEMENTATION_SUMMARY.md** - Technical details of changes
4. **Test scripts** - test_video_upload.sh and upload_video.sh

## Notifications

Notify the following teams:

- [ ] Development team - Feature is live
- [ ] QA team - New test scenarios
- [ ] DevOps team - Monitor deployment
- [ ] Support team - New feature documentation
- [ ] Users/Clients - New video upload capability

## Sign-off

- [ ] Code reviewed
- [ ] Tests passed
- [ ] Database migration verified
- [ ] Documentation complete
- [ ] Deployment successful
- [ ] Post-deployment verification complete
- [ ] Team notified

**Deployed by:** ********\_********  
**Date:** ********\_********  
**Version/Commit:** ********\_********

---

## Quick Commands Reference

```bash
# Start everything
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f audio-service

# Test audio upload
curl -X POST http://localhost:8080/api/v1/meetings/upload -F "audio=@test.mp3" -F "title=Test"

# Test video upload
curl -X POST http://localhost:8080/api/v1/meetings/upload -F "file=@test.mp4" -F "title=Test"

# Database migration
docker exec -i postgres psql -U transcript_user -d transcript_db < scripts/add-video-support.sql

# Backup database
docker exec postgres pg_dump -U transcript_user transcript_db > backup.sql

# Restore database
docker exec -i postgres psql -U transcript_user -d transcript_db < backup.sql
```
