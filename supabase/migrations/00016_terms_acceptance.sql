-- Terms acceptance tracking
-- Adds fields to user_profiles for legal consent tracking

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_version TEXT;

-- Index for checking terms acceptance status
CREATE INDEX IF NOT EXISTS idx_user_profiles_terms_version ON user_profiles(terms_version);

COMMENT ON COLUMN user_profiles.terms_accepted_at IS 'Timestamp when user accepted terms';
COMMENT ON COLUMN user_profiles.terms_version IS 'Version of terms the user accepted (e.g., 2026-01)';
