-- Migration: Add text-quote anchor fields to reader_progress
-- These fields enable reliable "perfect resume" that survives layout changes

-- Add anchor fields to reader_progress
ALTER TABLE reader_progress
ADD COLUMN IF NOT EXISTS anchor_prefix TEXT,
ADD COLUMN IF NOT EXISTS anchor_exact TEXT,
ADD COLUMN IF NOT EXISTS anchor_suffix TEXT,
ADD COLUMN IF NOT EXISTS anchor_char_offset INTEGER;

-- Add comment explaining the anchor system
COMMENT ON COLUMN reader_progress.anchor_prefix IS 'Text-quote anchor: ~20 chars before reading position';
COMMENT ON COLUMN reader_progress.anchor_exact IS 'Text-quote anchor: ~120 chars at reading position';
COMMENT ON COLUMN reader_progress.anchor_suffix IS 'Text-quote anchor: ~20 chars after exact text';
COMMENT ON COLUMN reader_progress.anchor_char_offset IS 'Text-quote anchor: approximate char offset (fallback)';

-- Update the upsert function to include anchor fields
CREATE OR REPLACE FUNCTION upsert_reader_progress(
  p_user_id UUID,
  p_book_id UUID,
  p_chapter_id UUID,
  p_paragraph_id TEXT,
  p_scroll_offset INTEGER DEFAULT 0,
  p_scroll_offset_ratio REAL DEFAULT 0,
  p_anchor_prefix TEXT DEFAULT NULL,
  p_anchor_exact TEXT DEFAULT NULL,
  p_anchor_suffix TEXT DEFAULT NULL,
  p_anchor_char_offset INTEGER DEFAULT NULL
)
RETURNS reader_progress AS $$
DECLARE
  result reader_progress;
BEGIN
  INSERT INTO reader_progress (
    user_id, book_id, chapter_id, paragraph_id,
    scroll_offset, scroll_offset_ratio,
    anchor_prefix, anchor_exact, anchor_suffix, anchor_char_offset
  )
  VALUES (
    p_user_id, p_book_id, p_chapter_id, p_paragraph_id,
    p_scroll_offset, p_scroll_offset_ratio,
    p_anchor_prefix, p_anchor_exact, p_anchor_suffix, p_anchor_char_offset
  )
  ON CONFLICT (user_id, book_id)
  DO UPDATE SET
    chapter_id = EXCLUDED.chapter_id,
    paragraph_id = EXCLUDED.paragraph_id,
    scroll_offset = EXCLUDED.scroll_offset,
    scroll_offset_ratio = EXCLUDED.scroll_offset_ratio,
    anchor_prefix = EXCLUDED.anchor_prefix,
    anchor_exact = EXCLUDED.anchor_exact,
    anchor_suffix = EXCLUDED.anchor_suffix,
    anchor_char_offset = EXCLUDED.anchor_char_offset,
    updated_at = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
