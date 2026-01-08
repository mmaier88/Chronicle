-- Performance Indexes Migration
-- Adds indexes for frequently queried columns that were missing

-- Index for filtering sections by status (common in write loop)
CREATE INDEX IF NOT EXISTS idx_sections_status ON sections(status);

-- Composite index for vibe_jobs user lookups with status filter
CREATE INDEX IF NOT EXISTS idx_vibe_jobs_user_status ON vibe_jobs(user_id, status);

-- Composite index for books owner lookups with status filter
CREATE INDEX IF NOT EXISTS idx_books_owner_status ON books(owner_id, status);

-- Index for semantic_blocks by book (for future embedding queries)
CREATE INDEX IF NOT EXISTS idx_semantic_blocks_book ON semantic_blocks(book_id);

-- Index for created_at on books for time-range queries
CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at DESC);

-- Index for share tokens lookup
CREATE INDEX IF NOT EXISTS idx_book_shares_book ON book_shares(book_id);

-- Index for chapters by book for ordered queries
CREATE INDEX IF NOT EXISTS idx_chapters_book_index ON chapters(book_id, index);

-- Index for sections by chapter for ordered queries
CREATE INDEX IF NOT EXISTS idx_sections_chapter_index ON sections(chapter_id, index);

-- Composite index for books by owner sorted by creation (common listing query)
CREATE INDEX IF NOT EXISTS idx_books_owner_created ON books(owner_id, created_at DESC);
