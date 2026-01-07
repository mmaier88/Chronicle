-- Covers & Shares Schema
-- Migration: 00004_covers_shares
-- Created: 2026-01-07
-- Book cover generation and shareable links for public reading

-- =============================================================================
-- 1. COVER FIELDS ON BOOKS TABLE
-- =============================================================================

ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_storage_path TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_status TEXT DEFAULT 'pending'
  CHECK (cover_status IN ('pending', 'generating', 'ready', 'failed'));
ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_generated_at TIMESTAMPTZ;

-- =============================================================================
-- 2. BOOK SHARES TABLE
-- =============================================================================

CREATE TABLE book_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ
);

CREATE INDEX idx_book_shares_token ON book_shares(share_token);
CREATE INDEX idx_book_shares_book ON book_shares(book_id);
-- One active share per book
CREATE UNIQUE INDEX idx_book_shares_unique_active ON book_shares(book_id) WHERE enabled = true;

-- =============================================================================
-- 3. ROW LEVEL SECURITY FOR SHARES
-- =============================================================================

ALTER TABLE book_shares ENABLE ROW LEVEL SECURITY;

-- Book owners can manage their shares
CREATE POLICY "Book owners can view shares" ON book_shares FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM books WHERE books.id = book_shares.book_id AND books.owner_id = auth.uid()
  ));

CREATE POLICY "Book owners can create shares" ON book_shares FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM books WHERE books.id = book_shares.book_id AND books.owner_id = auth.uid()
  ));

CREATE POLICY "Book owners can update shares" ON book_shares FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM books WHERE books.id = book_shares.book_id AND books.owner_id = auth.uid()
  ));

CREATE POLICY "Book owners can delete shares" ON book_shares FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM books WHERE books.id = book_shares.book_id AND books.owner_id = auth.uid()
  ));

-- =============================================================================
-- 4. HELPER FUNCTIONS FOR PUBLIC ACCESS (SECURITY DEFINER)
-- =============================================================================

-- Generate cryptographically secure share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Get book by share token (bypasses RLS for public access)
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
  -- Update view count and last accessed
  UPDATE book_shares
  SET view_count = view_count + 1, last_accessed_at = NOW()
  WHERE share_token = token AND enabled = true;

  RETURN QUERY
  SELECT b.id, b.title, b.core_question, b.genre::TEXT, b.cover_url, b.audio_voice_id, b.audio_voice_name
  FROM book_shares s
  JOIN books b ON b.id = s.book_id
  WHERE s.share_token = token AND s.enabled = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get chapters for shared book
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
  WHERE s.share_token = token AND s.enabled = true
  ORDER BY c.index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get sections for shared book
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
  WHERE s.share_token = token AND s.enabled = true
  ORDER BY c.index, sec.index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate share token for TTS access
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
      AND sec.id = section_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get book ID from share token (for cover generation etc)
CREATE OR REPLACE FUNCTION get_book_id_from_share(token TEXT)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT book_id FROM book_shares
    WHERE share_token = token AND enabled = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. COVERS STORAGE BUCKET
-- =============================================================================

-- Create covers storage bucket (public for easy access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers',
  'covers',
  true,  -- Public bucket for cover images
  5242880,  -- 5MB max file size
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can view, owners can upload/delete
CREATE POLICY "Anyone can view covers" ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

CREATE POLICY "Book owners can upload covers" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'covers' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Book owners can delete own covers" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'covers' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================================================
-- COVERS & SHARES SCHEMA READY
-- =============================================================================
