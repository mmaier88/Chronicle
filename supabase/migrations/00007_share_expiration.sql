-- Share Expiration
-- Migration: 00007_share_expiration
-- Created: 2026-01-08
-- Adds expires_at column to book_shares for time-limited share links

-- =============================================================================
-- 1. ADD EXPIRES_AT COLUMN
-- =============================================================================

ALTER TABLE book_shares ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- =============================================================================
-- 2. UPDATE HELPER FUNCTIONS TO CHECK EXPIRATION
-- =============================================================================

-- Get book by share token (bypasses RLS for public access)
-- Updated to check expiration
CREATE OR REPLACE FUNCTION get_shared_book(token TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  core_question TEXT,
  genre TEXT,
  cover_url TEXT,
  audio_voice_id TEXT,
  audio_voice_name TEXT
) AS $$
BEGIN
  -- Update view count and last accessed (only if not expired)
  UPDATE book_shares
  SET view_count = view_count + 1, last_accessed_at = NOW()
  WHERE share_token = token
    AND enabled = true
    AND (expires_at IS NULL OR expires_at > NOW());

  RETURN QUERY
  SELECT b.id, b.title, b.core_question, b.genre::TEXT, b.cover_url, b.audio_voice_id, b.audio_voice_name
  FROM book_shares s
  JOIN books b ON b.id = s.book_id
  WHERE s.share_token = token
    AND s.enabled = true
    AND (s.expires_at IS NULL OR s.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get chapters for shared book - check expiration
CREATE OR REPLACE FUNCTION get_shared_chapters(token TEXT)
RETURNS TABLE (
  id UUID,
  index INT,
  title TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.index, c.title
  FROM book_shares s
  JOIN books b ON b.id = s.book_id
  JOIN chapters c ON c.book_id = b.id
  WHERE s.share_token = token
    AND s.enabled = true
    AND (s.expires_at IS NULL OR s.expires_at > NOW())
  ORDER BY c.index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get sections for shared book - check expiration
CREATE OR REPLACE FUNCTION get_shared_sections(token TEXT)
RETURNS TABLE (
  id UUID,
  chapter_id UUID,
  index INT,
  title TEXT,
  content_text TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT sec.id, sec.chapter_id, sec.index, sec.title, sec.content_text
  FROM book_shares s
  JOIN books b ON b.id = s.book_id
  JOIN chapters c ON c.book_id = b.id
  JOIN sections sec ON sec.chapter_id = c.id
  WHERE s.share_token = token
    AND s.enabled = true
    AND (s.expires_at IS NULL OR s.expires_at > NOW())
  ORDER BY c.index, sec.index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate share token for TTS access - check expiration
CREATE OR REPLACE FUNCTION validate_share_token(token TEXT, section_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM book_shares s
    JOIN books b ON b.id = s.book_id
    JOIN chapters c ON c.book_id = b.id
    JOIN sections sec ON sec.chapter_id = c.id
    WHERE s.share_token = token
      AND s.enabled = true
      AND (s.expires_at IS NULL OR s.expires_at > NOW())
      AND sec.id = section_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get book ID from share token - check expiration
CREATE OR REPLACE FUNCTION get_book_id_from_share(token TEXT)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT book_id FROM book_shares
    WHERE share_token = token
      AND enabled = true
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. INDEX FOR EFFICIENT EXPIRATION QUERIES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_book_shares_expires ON book_shares(expires_at)
  WHERE enabled = true AND expires_at IS NOT NULL;

-- =============================================================================
-- SHARE EXPIRATION SCHEMA READY
-- =============================================================================
