-- Audio TTS Schema
-- Migration: 00003_audio_tts
-- Created: 2025-01-06
-- ElevenLabs text-to-speech integration with 30-day auto-cleanup

-- =============================================================================
-- 1. SECTION AUDIO TABLE
-- =============================================================================

CREATE TABLE section_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE NOT NULL,
  content_hash TEXT NOT NULL,           -- MD5 of source text for cache invalidation
  storage_path TEXT NOT NULL,           -- Path in Supabase Storage bucket
  voice_id TEXT NOT NULL,               -- ElevenLabs voice ID
  voice_name TEXT,                      -- Human-readable voice name
  duration_seconds INTEGER,             -- Audio duration for UI
  file_size_bytes INTEGER,              -- For storage tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()  -- For 30-day cleanup
);

CREATE INDEX idx_section_audio_section ON section_audio(section_id);
CREATE INDEX idx_section_audio_status ON section_audio(status);
CREATE INDEX idx_section_audio_last_accessed ON section_audio(last_accessed_at);
CREATE UNIQUE INDEX idx_section_audio_hash ON section_audio(section_id, content_hash);

-- =============================================================================
-- 2. BOOK AUDIO SETTINGS
-- =============================================================================

ALTER TABLE books ADD COLUMN IF NOT EXISTS audio_voice_id TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS audio_voice_name TEXT;

-- =============================================================================
-- 3. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE section_audio ENABLE ROW LEVEL SECURITY;

-- Section audio: book owners only (via section -> chapter -> book chain)
CREATE POLICY "Book owners can view section audio" ON section_audio FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sections s
    JOIN chapters c ON c.id = s.chapter_id
    JOIN books b ON b.id = c.book_id
    WHERE s.id = section_audio.section_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Book owners can manage section audio" ON section_audio FOR ALL
  USING (EXISTS (
    SELECT 1 FROM sections s
    JOIN chapters c ON c.id = s.chapter_id
    JOIN books b ON b.id = c.book_id
    WHERE s.id = section_audio.section_id AND b.owner_id = auth.uid()
  ));

-- =============================================================================
-- 4. HELPER FUNCTION: Update last_accessed_at
-- =============================================================================

CREATE OR REPLACE FUNCTION touch_section_audio(audio_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE section_audio
  SET last_accessed_at = NOW()
  WHERE id = audio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. CLEANUP FUNCTION: Delete stale audio (30 days)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_stale_audio()
RETURNS TABLE (deleted_count INTEGER, storage_paths TEXT[]) AS $$
DECLARE
  paths TEXT[];
  count INTEGER;
BEGIN
  -- Get storage paths of audio to delete (for storage cleanup)
  SELECT ARRAY_AGG(storage_path) INTO paths
  FROM section_audio
  WHERE last_accessed_at < NOW() - INTERVAL '30 days'
    AND status = 'ready';

  -- Delete stale records
  DELETE FROM section_audio
  WHERE last_accessed_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS count = ROW_COUNT;

  RETURN QUERY SELECT count, COALESCE(paths, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. STORAGE BUCKET
-- =============================================================================

-- Create audio storage bucket (private, only accessible via signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio',
  'audio',
  false,
  52428800,  -- 50MB max file size
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: book owners can access their audio files
CREATE POLICY "Book owners can upload audio" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Book owners can read own audio" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Book owners can delete own audio" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================================================
-- AUDIO TTS SCHEMA READY
-- =============================================================================
