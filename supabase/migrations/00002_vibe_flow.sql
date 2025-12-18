-- Vibe Flow Schema
-- Migration: 00002_vibe_flow
-- Created: 2025-12-18
-- Consumer-facing "Vibe a Book" automated generation flow

-- =============================================================================
-- 1. NEW TYPES
-- =============================================================================

CREATE TYPE book_source AS ENUM ('author', 'vibe');
CREATE TYPE vibe_job_status AS ENUM ('queued', 'running', 'failed', 'complete');

-- =============================================================================
-- 2. ADD SOURCE FIELD TO BOOKS
-- =============================================================================

ALTER TABLE books ADD COLUMN source book_source DEFAULT 'author';

-- Update existing books to be 'author' sourced
UPDATE books SET source = 'author' WHERE source IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE books ALTER COLUMN source SET NOT NULL;

-- =============================================================================
-- 3. VIBE JOBS TABLE
-- =============================================================================

CREATE TABLE vibe_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,

  -- Input
  genre book_genre NOT NULL,
  user_prompt TEXT NOT NULL,

  -- Spoiler-light preview (title, blurb, cast, setting, promise, warnings)
  preview JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Progress tracking
  status vibe_job_status NOT NULL DEFAULT 'queued',
  step TEXT, -- e.g. 'constitution', 'plan', 'write_ch1_s1', 'consistency_ch1_s1', 'finalize'
  progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- Running context for coherence
  story_synopsis TEXT,

  -- Error handling
  error TEXT,
  attempt INT NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_vibe_jobs_user ON vibe_jobs(user_id);
CREATE INDEX idx_vibe_jobs_book ON vibe_jobs(book_id);
CREATE INDEX idx_vibe_jobs_status ON vibe_jobs(status);

-- Updated at trigger
CREATE TRIGGER update_vibe_jobs_updated_at BEFORE UPDATE ON vibe_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. ROW LEVEL SECURITY FOR VIBE JOBS
-- =============================================================================

ALTER TABLE vibe_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vibe jobs" ON vibe_jobs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create vibe jobs" ON vibe_jobs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vibe jobs" ON vibe_jobs
  FOR UPDATE USING (user_id = auth.uid());

-- =============================================================================
-- 5. HELPER: Get today's job count for rate limiting
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_vibe_job_count_today(user_uuid UUID)
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INT
    FROM vibe_jobs
    WHERE user_id = user_uuid
    AND created_at >= CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- VIBE FLOW SCHEMA READY
-- =============================================================================
