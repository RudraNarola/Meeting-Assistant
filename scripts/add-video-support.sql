-- Migration script to add video support to existing databases
-- Run this if you already have an existing database

-- Add video_id column to audio_files table
ALTER TABLE audio_files ADD COLUMN IF NOT EXISTS video_id UUID;

-- Create video_files table
CREATE TABLE IF NOT EXISTS video_files (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audio_files_video ON audio_files(video_id);
CREATE INDEX IF NOT EXISTS idx_video_files_meeting ON video_files(meeting_id);

-- Note: We don't add a foreign key constraint for audio_files.video_id -> video_files.id
-- because it would create a circular dependency with video_files.audio_file_id -> audio_files.id
-- The relationship is maintained through application logic instead.
