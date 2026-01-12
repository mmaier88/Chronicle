-- Auto-resume tracking for stuck jobs
-- Tracks how many times the cron job has attempted to resume a job

-- Add auto_resume_attempts column to vibe_jobs
ALTER TABLE vibe_jobs ADD COLUMN IF NOT EXISTS auto_resume_attempts INT NOT NULL DEFAULT 0;

-- Index for finding stuck jobs efficiently
CREATE INDEX IF NOT EXISTS idx_vibe_jobs_auto_resume
  ON vibe_jobs(status, updated_at, auto_resume_attempts)
  WHERE status IN ('running', 'queued');

-- Comment explaining the field
COMMENT ON COLUMN vibe_jobs.auto_resume_attempts IS 'Number of times the auto-resume cron has attempted to continue this job. Resets on user-initiated resume.';
