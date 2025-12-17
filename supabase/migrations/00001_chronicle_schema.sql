-- Chronicle Schema
-- Migration: 00001_chronicle_schema
-- Created: 2025-12-17
-- AI-native book writing system

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =============================================================================
-- 1. TYPES
-- =============================================================================

CREATE TYPE book_status AS ENUM ('drafting', 'editing', 'final');
CREATE TYPE book_genre AS ENUM ('non_fiction', 'literary_fiction');
CREATE TYPE content_status AS ENUM ('draft', 'locked', 'canonical');
CREATE TYPE milestone_version AS ENUM ('v1', 'v2', 'final');
CREATE TYPE claim_block_type AS ENUM ('assertion', 'definition', 'premise', 'inference', 'counterclaim');
CREATE TYPE claim_stance AS ENUM ('pro', 'con', 'neutral');

-- =============================================================================
-- 2. USER PROFILES
-- =============================================================================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. BOOKS (owner-only, no workspaces)
-- =============================================================================

CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  genre book_genre NOT NULL DEFAULT 'non_fiction',
  core_question TEXT,
  status book_status DEFAULT 'drafting',
  constitution_json JSONB DEFAULT '{
    "central_thesis": null,
    "worldview_frame": null,
    "narrative_voice": null,
    "what_book_is_against": null,
    "what_book_refuses_to_do": null,
    "ideal_reader": null,
    "taboo_simplifications": null
  }'::jsonb,
  constitution_locked BOOLEAN DEFAULT FALSE,
  constitution_locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_books_owner ON books(owner_id);

-- =============================================================================
-- 4. CHAPTERS
-- =============================================================================

CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  index INT NOT NULL,
  title TEXT NOT NULL,
  purpose TEXT,
  central_claim TEXT,
  emotional_arc TEXT,
  failure_mode TEXT,
  dependencies UUID[] DEFAULT '{}',
  motifs TEXT[] DEFAULT '{}',
  status content_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, index)
);

CREATE INDEX idx_chapters_book ON chapters(book_id);

-- =============================================================================
-- 5. SECTIONS
-- =============================================================================

CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
  index INT NOT NULL,
  title TEXT NOT NULL,
  goal TEXT,
  local_claim TEXT,
  constraints TEXT,
  content_json JSONB DEFAULT '{}'::jsonb,
  content_text TEXT,
  status content_status DEFAULT 'draft',
  promoted_at TIMESTAMPTZ,
  promoted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chapter_id, index)
);

CREATE INDEX idx_sections_chapter ON sections(chapter_id);

-- =============================================================================
-- 6. MILESTONES & EMBEDDINGS
-- =============================================================================

CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  version milestone_version NOT NULL,
  content_snapshot JSONB NOT NULL,
  content_text TEXT NOT NULL,
  embedded BOOLEAN DEFAULT FALSE,
  embedded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milestones_book ON milestones(book_id);

CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID REFERENCES milestones(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1024),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_embeddings_book ON embeddings(book_id);
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =============================================================================
-- 7. SEMANTIC BLOCKS
-- =============================================================================

CREATE TABLE semantic_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('claim', 'motif', 'thread', 'note')),
  content TEXT NOT NULL,
  claim_type claim_block_type,
  stance claim_stance,
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  canonical BOOLEAN DEFAULT FALSE,
  start_offset INT,
  end_offset INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_semantic_blocks_section ON semantic_blocks(section_id);

-- =============================================================================
-- 8. CONSISTENCY REPORTS
-- =============================================================================

CREATE TABLE consistency_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('chapter', 'book')),
  contradictions JSONB DEFAULT '[]'::jsonb,
  tone_drift JSONB DEFAULT '[]'::jsonb,
  unresolved_threads JSONB DEFAULT '[]'::jsonb,
  constitution_violations JSONB DEFAULT '[]'::jsonb,
  summary TEXT,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consistency_reports_book ON consistency_reports(book_id);

-- =============================================================================
-- 9. AI JOBS
-- =============================================================================

CREATE TABLE ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('constitution', 'chapter', 'section', 'extract', 'consistency')),
  target_id UUID,
  model_name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'anthropic',
  input_tokens INT,
  output_tokens INT,
  cost_usd NUMERIC(10, 6),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_jobs_book ON ai_jobs(book_id);

-- =============================================================================
-- 10. TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- 11. ROW LEVEL SECURITY (simple owner-only)
-- =============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE consistency_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;

-- User profiles
CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (id = auth.uid());

-- Books: owners only
CREATE POLICY "Users can view own books" ON books FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create books" ON books FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own books" ON books FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own books" ON books FOR DELETE USING (owner_id = auth.uid());

-- Chapters: book owners
CREATE POLICY "Book owners can view chapters" ON chapters FOR SELECT
  USING (EXISTS (SELECT 1 FROM books WHERE books.id = chapters.book_id AND books.owner_id = auth.uid()));
CREATE POLICY "Book owners can manage chapters" ON chapters FOR ALL
  USING (EXISTS (SELECT 1 FROM books WHERE books.id = chapters.book_id AND books.owner_id = auth.uid()));

-- Sections: book owners
CREATE POLICY "Book owners can view sections" ON sections FOR SELECT
  USING (EXISTS (SELECT 1 FROM chapters c JOIN books b ON b.id = c.book_id WHERE c.id = sections.chapter_id AND b.owner_id = auth.uid()));
CREATE POLICY "Book owners can manage sections" ON sections FOR ALL
  USING (EXISTS (SELECT 1 FROM chapters c JOIN books b ON b.id = c.book_id WHERE c.id = sections.chapter_id AND b.owner_id = auth.uid()));

-- Milestones
CREATE POLICY "Book owners can view milestones" ON milestones FOR SELECT
  USING (EXISTS (SELECT 1 FROM books WHERE books.id = milestones.book_id AND books.owner_id = auth.uid()));
CREATE POLICY "Book owners can create milestones" ON milestones FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM books WHERE books.id = milestones.book_id AND books.owner_id = auth.uid()));

-- Embeddings
CREATE POLICY "Book owners can view embeddings" ON embeddings FOR SELECT
  USING (EXISTS (SELECT 1 FROM books WHERE books.id = embeddings.book_id AND books.owner_id = auth.uid()));

-- Semantic blocks
CREATE POLICY "Book owners can view semantic blocks" ON semantic_blocks FOR SELECT
  USING (EXISTS (SELECT 1 FROM books WHERE books.id = semantic_blocks.book_id AND books.owner_id = auth.uid()));
CREATE POLICY "Book owners can manage semantic blocks" ON semantic_blocks FOR ALL
  USING (EXISTS (SELECT 1 FROM books WHERE books.id = semantic_blocks.book_id AND books.owner_id = auth.uid()));

-- Consistency reports
CREATE POLICY "Book owners can view reports" ON consistency_reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM books WHERE books.id = consistency_reports.book_id AND books.owner_id = auth.uid()));

-- AI jobs
CREATE POLICY "Book owners can view ai jobs" ON ai_jobs FOR SELECT
  USING (EXISTS (SELECT 1 FROM books WHERE books.id = ai_jobs.book_id AND books.owner_id = auth.uid()));

-- =============================================================================
-- 12. HELPER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION search_book_embeddings(
  book_uuid UUID,
  query_embedding VECTOR(1024),
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (milestone_id UUID, chunk_index INT, content TEXT, similarity FLOAT) AS $$
BEGIN
  RETURN QUERY
  SELECT e.milestone_id, e.chunk_index, e.content, 1 - (e.embedding <=> query_embedding) AS similarity
  FROM embeddings e
  WHERE e.book_id = book_uuid AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- CHRONICLE SCHEMA READY
-- =============================================================================
