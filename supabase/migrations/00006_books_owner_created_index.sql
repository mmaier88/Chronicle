-- Additional Performance Index
-- Composite index for books by owner sorted by creation (common listing query)
CREATE INDEX IF NOT EXISTS idx_books_owner_created ON books(owner_id, created_at DESC);
