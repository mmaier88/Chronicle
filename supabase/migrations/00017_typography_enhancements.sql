-- Migration: Add enhanced typography settings
-- Adds: margins, justify columns to typography_settings table

-- Add margins column (defaults to 'normal')
ALTER TABLE typography_settings
ADD COLUMN IF NOT EXISTS margins TEXT DEFAULT 'normal' CHECK (margins IN ('narrow', 'normal', 'wide'));

-- Add justify column (defaults to false)
ALTER TABLE typography_settings
ADD COLUMN IF NOT EXISTS justify BOOLEAN DEFAULT false;

-- Update theme check constraint to include new themes (sepia, midnight)
-- First drop the old constraint if it exists, then add new one
DO $$
BEGIN
  -- Try to drop old constraint
  BEGIN
    ALTER TABLE typography_settings DROP CONSTRAINT IF EXISTS typography_settings_theme_check;
  EXCEPTION WHEN undefined_object THEN
    -- Constraint doesn't exist, that's fine
    NULL;
  END;
END $$;

-- Add new constraint that allows all 4 themes
ALTER TABLE typography_settings
DROP CONSTRAINT IF EXISTS typography_settings_theme_check;

ALTER TABLE typography_settings
ADD CONSTRAINT typography_settings_theme_check
CHECK (theme IN ('light', 'dark', 'sepia', 'midnight', 'warm-night'));
