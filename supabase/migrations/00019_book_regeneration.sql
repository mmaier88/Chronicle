-- Book Regeneration Schema
-- Migration: 00019_book_regeneration
-- Created: 2025-01-15
-- Adds lineage tracking for book regeneration feature

-- =============================================================================
-- 1. ADD REGENERATION TRACKING TO BOOKS
-- =============================================================================

-- Source book reference - tracks which book this was regenerated from
ALTER TABLE books ADD COLUMN source_book_id UUID REFERENCES books(id) ON DELETE SET NULL;

-- Chapter index from which regeneration started (null = full regen, 0+ = from chapter N)
ALTER TABLE books ADD COLUMN source_chapter_index INT;

-- Index for finding regenerated versions of a book
CREATE INDEX idx_books_source_book ON books(source_book_id) WHERE source_book_id IS NOT NULL;

-- =============================================================================
-- 2. ADD REGENERATION TRACKING TO VIBE_JOBS
-- =============================================================================

-- Track regeneration context in jobs for proper handling during generation
ALTER TABLE vibe_jobs ADD COLUMN source_book_id UUID REFERENCES books(id) ON DELETE SET NULL;
ALTER TABLE vibe_jobs ADD COLUMN source_chapter_index INT;

-- =============================================================================
-- REGENERATION SCHEMA READY
-- =============================================================================
