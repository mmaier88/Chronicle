-- Chronicle Reader Progress & Typography
-- Enables perfect resume across sessions and devices

-- =============================================================================
-- READER PROGRESS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS reader_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE SET NULL,
  paragraph_id TEXT NOT NULL, -- Content-derived hash, not FK
  scroll_offset INTEGER DEFAULT 0, -- Pixel offset (desktop/iOS)
  scroll_offset_ratio REAL DEFAULT 0, -- 0-1 ratio (mobile web)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One progress record per user per book
  UNIQUE(user_id, book_id)
);

-- Index for fast lookups
CREATE INDEX idx_reader_progress_user_book ON reader_progress(user_id, book_id);

-- Enable RLS
ALTER TABLE reader_progress ENABLE ROW LEVEL SECURITY;

-- Users can only access their own progress
CREATE POLICY "Users can view own progress"
  ON reader_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON reader_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON reader_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
  ON reader_progress FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- AUDIO PROGRESS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS audio_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  paragraph_id TEXT NOT NULL, -- Content-derived hash
  audio_offset_ms INTEGER DEFAULT 0, -- Milliseconds into current audio
  playback_speed REAL DEFAULT 1.0, -- 0.75, 1.0, 1.25, 1.5, 2.0
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One audio progress per user per book
  UNIQUE(user_id, book_id)
);

-- Index for fast lookups
CREATE INDEX idx_audio_progress_user_book ON audio_progress(user_id, book_id);

-- Enable RLS
ALTER TABLE audio_progress ENABLE ROW LEVEL SECURITY;

-- Users can only access their own audio progress
CREATE POLICY "Users can view own audio progress"
  ON audio_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audio progress"
  ON audio_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audio progress"
  ON audio_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own audio progress"
  ON audio_progress FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- TYPOGRAPHY SETTINGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS typography_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  font_size INTEGER DEFAULT 17 CHECK (font_size >= 12 AND font_size <= 32),
  line_height REAL DEFAULT 1.5 CHECK (line_height >= 1.0 AND line_height <= 2.5),
  font_family TEXT DEFAULT 'serif' CHECK (font_family IN ('serif', 'sans')),
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'warm-night')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE typography_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own settings
CREATE POLICY "Users can view own typography"
  ON typography_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own typography"
  ON typography_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own typography"
  ON typography_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================================================
-- UPDATE TRIGGERS
-- =============================================================================

-- Auto-update updated_at on reader_progress
CREATE OR REPLACE FUNCTION update_reader_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reader_progress_updated
  BEFORE UPDATE ON reader_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_reader_progress_timestamp();

-- Auto-update updated_at on audio_progress
CREATE TRIGGER trigger_audio_progress_updated
  BEFORE UPDATE ON audio_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_reader_progress_timestamp();

-- Auto-update updated_at on typography_settings
CREATE TRIGGER trigger_typography_updated
  BEFORE UPDATE ON typography_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_reader_progress_timestamp();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Upsert reader progress (atomic save)
CREATE OR REPLACE FUNCTION upsert_reader_progress(
  p_user_id UUID,
  p_book_id UUID,
  p_chapter_id UUID,
  p_paragraph_id TEXT,
  p_scroll_offset INTEGER DEFAULT 0,
  p_scroll_offset_ratio REAL DEFAULT 0
)
RETURNS reader_progress AS $$
DECLARE
  result reader_progress;
BEGIN
  INSERT INTO reader_progress (user_id, book_id, chapter_id, paragraph_id, scroll_offset, scroll_offset_ratio)
  VALUES (p_user_id, p_book_id, p_chapter_id, p_paragraph_id, p_scroll_offset, p_scroll_offset_ratio)
  ON CONFLICT (user_id, book_id)
  DO UPDATE SET
    chapter_id = EXCLUDED.chapter_id,
    paragraph_id = EXCLUDED.paragraph_id,
    scroll_offset = EXCLUDED.scroll_offset,
    scroll_offset_ratio = EXCLUDED.scroll_offset_ratio,
    updated_at = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upsert audio progress (atomic save)
CREATE OR REPLACE FUNCTION upsert_audio_progress(
  p_user_id UUID,
  p_book_id UUID,
  p_paragraph_id TEXT,
  p_audio_offset_ms INTEGER DEFAULT 0,
  p_playback_speed REAL DEFAULT 1.0
)
RETURNS audio_progress AS $$
DECLARE
  result audio_progress;
BEGIN
  INSERT INTO audio_progress (user_id, book_id, paragraph_id, audio_offset_ms, playback_speed)
  VALUES (p_user_id, p_book_id, p_paragraph_id, p_audio_offset_ms, p_playback_speed)
  ON CONFLICT (user_id, book_id)
  DO UPDATE SET
    paragraph_id = EXCLUDED.paragraph_id,
    audio_offset_ms = EXCLUDED.audio_offset_ms,
    playback_speed = EXCLUDED.playback_speed,
    updated_at = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upsert typography settings
CREATE OR REPLACE FUNCTION upsert_typography_settings(
  p_user_id UUID,
  p_font_size INTEGER DEFAULT 17,
  p_line_height REAL DEFAULT 1.5,
  p_font_family TEXT DEFAULT 'serif',
  p_theme TEXT DEFAULT 'dark'
)
RETURNS typography_settings AS $$
DECLARE
  result typography_settings;
BEGIN
  INSERT INTO typography_settings (user_id, font_size, line_height, font_family, theme)
  VALUES (p_user_id, p_font_size, p_line_height, p_font_family, p_theme)
  ON CONFLICT (user_id)
  DO UPDATE SET
    font_size = EXCLUDED.font_size,
    line_height = EXCLUDED.line_height,
    font_family = EXCLUDED.font_family,
    theme = EXCLUDED.theme,
    updated_at = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE reader_progress IS 'Tracks reading position per user per book for perfect resume';
COMMENT ON TABLE audio_progress IS 'Tracks audio playback position per user per book';
COMMENT ON TABLE typography_settings IS 'User typography preferences, synced across all books';
