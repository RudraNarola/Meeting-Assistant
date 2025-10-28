-- Create tables for transcript generation system

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- 'google_meet', 'zoom'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending' -- 'pending', 'processing', 'completed', 'failed'
);

-- Audio files table
CREATE TABLE IF NOT EXISTS audio_files (
    id UUID PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    video_id UUID, -- References video_files(id), nullable for direct audio uploads
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    duration FLOAT,
    format VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE
);

-- Video files table
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

-- Transcriptions table
CREATE TABLE IF NOT EXISTS transcriptions (
    id UUID PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    audio_file_id UUID REFERENCES audio_files(id) ON DELETE CASCADE,
    full_text TEXT,
    language VARCHAR(10) DEFAULT 'en',
    confidence FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending'
);

-- Speakers table
CREATE TABLE IF NOT EXISTS speakers (
    id UUID PRIMARY KEY,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    name VARCHAR(255),
    label VARCHAR(50) NOT NULL, -- 'Speaker 1', 'Speaker 2', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transcript segments table (each phrase/sentence with speaker info)
CREATE TABLE IF NOT EXISTS transcript_segments (
    id UUID PRIMARY KEY,
    transcription_id UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
    speaker_id UUID REFERENCES speakers(id) ON DELETE SET NULL,
    text TEXT NOT NULL,
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    confidence FLOAT,
    sequence_number INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_audio_files_meeting ON audio_files(meeting_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_video ON audio_files(video_id);
CREATE INDEX IF NOT EXISTS idx_video_files_meeting ON video_files(meeting_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_meeting ON transcriptions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_speakers_meeting ON speakers(meeting_id);
CREATE INDEX IF NOT EXISTS idx_segments_transcription ON transcript_segments(transcription_id);
CREATE INDEX IF NOT EXISTS idx_segments_speaker ON transcript_segments(speaker_id);
CREATE INDEX IF NOT EXISTS idx_segments_sequence ON transcript_segments(sequence_number);
