-- Add cover_concept column to books table
-- Stores the distilled concept for cover regeneration

ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_concept JSONB;

COMMENT ON COLUMN books.cover_concept IS 'Stores the visual concept (theme, metaphor, emotion) used for cover generation';
