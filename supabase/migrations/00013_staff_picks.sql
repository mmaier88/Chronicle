-- Add staff picks fields to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS is_staff_pick BOOLEAN DEFAULT false;
ALTER TABLE books ADD COLUMN IF NOT EXISTS staff_pick_order INT DEFAULT 0;

-- Index for efficient staff picks queries
CREATE INDEX IF NOT EXISTS idx_books_staff_pick ON books(is_staff_pick) WHERE is_staff_pick = true;

-- Create a function to get staff picks (public access, bypasses RLS)
CREATE OR REPLACE FUNCTION get_staff_picks(pick_limit INT DEFAULT 6)
RETURNS TABLE (
  id UUID,
  title TEXT,
  core_question TEXT,
  cover_url TEXT,
  genre TEXT,
  share_token TEXT,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.title,
    b.core_question,
    b.cover_url,
    b.genre::TEXT,
    bs.share_token,
    b.created_at
  FROM books b
  LEFT JOIN book_shares bs ON b.id = bs.book_id AND bs.enabled = true
  WHERE b.is_staff_pick = true
    AND b.status = 'final'
    AND b.cover_url IS NOT NULL
    AND bs.share_token IS NOT NULL  -- Must have sharing enabled
  ORDER BY b.staff_pick_order ASC, b.created_at DESC
  LIMIT pick_limit;
END;
$$;

-- Grant execute to anonymous users (public access)
GRANT EXECUTE ON FUNCTION get_staff_picks TO anon;
GRANT EXECUTE ON FUNCTION get_staff_picks TO authenticated;
