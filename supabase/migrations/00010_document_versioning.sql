-- Document Versioning Schema for Git-style collaboration
-- This enables version history, snapshots, branches, and merge workflows

-- ============================================================================
-- SNAPSHOTS TABLE
-- Stores complete document state at specific points in time
-- ============================================================================
CREATE TABLE IF NOT EXISTS doc_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES doc_branches(id) ON DELETE CASCADE,

  -- Content state
  crdt_state JSONB NOT NULL,          -- Serialized editor/CRDT state (Tiptap JSON)
  content_text TEXT,                   -- Plain text for search/preview
  content_preview TEXT,                -- First 500 chars for preview
  word_count INTEGER DEFAULT 0,

  -- Version metadata
  version_number INTEGER NOT NULL,
  commit_message TEXT,
  parent_snapshot_id UUID REFERENCES doc_snapshots(id),

  -- Authorship
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique version numbers per branch
  CONSTRAINT unique_branch_version UNIQUE(document_id, branch_id, version_number)
);

-- Index for fast version history queries
CREATE INDEX IF NOT EXISTS idx_doc_snapshots_document ON doc_snapshots(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_snapshots_branch ON doc_snapshots(branch_id);
CREATE INDEX IF NOT EXISTS idx_doc_snapshots_created_at ON doc_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_snapshots_parent ON doc_snapshots(parent_snapshot_id);

-- ============================================================================
-- DIFFS TABLE
-- Stores computed differences between snapshots for efficient comparison
-- ============================================================================
CREATE TABLE IF NOT EXISTS doc_diffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_snapshot_id UUID NOT NULL REFERENCES doc_snapshots(id) ON DELETE CASCADE,
  to_snapshot_id UUID NOT NULL REFERENCES doc_snapshots(id) ON DELETE CASCADE,

  -- Diff data
  diff_data JSONB NOT NULL,            -- Structured diff operations
  additions_count INTEGER DEFAULT 0,
  deletions_count INTEGER DEFAULT 0,
  changes_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique diff pairs
  CONSTRAINT unique_diff_pair UNIQUE(from_snapshot_id, to_snapshot_id)
);

-- Index for fast diff lookups
CREATE INDEX IF NOT EXISTS idx_doc_diffs_from ON doc_diffs(from_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_doc_diffs_to ON doc_diffs(to_snapshot_id);

-- ============================================================================
-- MERGE REQUESTS TABLE
-- Git-style pull/merge requests for collaborative review
-- ============================================================================
CREATE TABLE IF NOT EXISTS merge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Branch references
  source_branch_id UUID NOT NULL REFERENCES doc_branches(id) ON DELETE CASCADE,
  target_branch_id UUID NOT NULL REFERENCES doc_branches(id) ON DELETE CASCADE,

  -- Request content
  title TEXT NOT NULL,
  description TEXT,

  -- Status tracking
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'merged', 'closed', 'conflict')),

  -- Authorship
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Merge info
  merged_at TIMESTAMPTZ,
  merged_by UUID REFERENCES auth.users(id),
  merged_snapshot_id UUID REFERENCES doc_snapshots(id),

  -- Prevent self-merge
  CONSTRAINT no_self_merge CHECK (source_branch_id != target_branch_id)
);

-- Index for fast merge request queries
CREATE INDEX IF NOT EXISTS idx_merge_requests_document ON merge_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_merge_requests_status ON merge_requests(status);
CREATE INDEX IF NOT EXISTS idx_merge_requests_created_by ON merge_requests(created_by);

-- ============================================================================
-- MERGE REQUEST COMMENTS TABLE
-- Comments and reviews on merge requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS merge_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merge_request_id UUID NOT NULL REFERENCES merge_requests(id) ON DELETE CASCADE,

  -- Comment content
  content TEXT NOT NULL,

  -- Optional: link to specific snapshot/diff location
  snapshot_id UUID REFERENCES doc_snapshots(id),
  line_number INTEGER,

  -- Authorship
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Threading
  parent_comment_id UUID REFERENCES merge_request_comments(id),

  -- Resolution status
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mr_comments_merge_request ON merge_request_comments(merge_request_id);
CREATE INDEX IF NOT EXISTS idx_mr_comments_parent ON merge_request_comments(parent_comment_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE doc_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_diffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE merge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE merge_request_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view snapshots for accessible documents" ON doc_snapshots;
DROP POLICY IF EXISTS "Users can create snapshots for accessible documents" ON doc_snapshots;
DROP POLICY IF EXISTS "Users can view diffs for accessible snapshots" ON doc_diffs;
DROP POLICY IF EXISTS "Users can create diffs for accessible snapshots" ON doc_diffs;
DROP POLICY IF EXISTS "Users can view merge requests for accessible documents" ON merge_requests;
DROP POLICY IF EXISTS "Users can create merge requests for accessible documents" ON merge_requests;
DROP POLICY IF EXISTS "Users can update their own merge requests" ON merge_requests;
DROP POLICY IF EXISTS "Admins can update any merge request" ON merge_requests;
DROP POLICY IF EXISTS "Users can view comments for accessible merge requests" ON merge_request_comments;
DROP POLICY IF EXISTS "Users can create comments on accessible merge requests" ON merge_request_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON merge_request_comments;

-- Snapshots: Users can view/create snapshots for documents they have access to
CREATE POLICY "Users can view snapshots for accessible documents"
  ON doc_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN projects p ON d.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE d.id = doc_snapshots.document_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create snapshots for accessible documents"
  ON doc_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN projects p ON d.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE d.id = doc_snapshots.document_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

-- Diffs: Follow snapshot access
CREATE POLICY "Users can view diffs for accessible snapshots"
  ON doc_diffs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM doc_snapshots s
      JOIN documents d ON s.document_id = d.id
      JOIN projects p ON d.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE s.id = doc_diffs.from_snapshot_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create diffs for accessible snapshots"
  ON doc_diffs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM doc_snapshots s
      JOIN documents d ON s.document_id = d.id
      JOIN projects p ON d.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE s.id = doc_diffs.from_snapshot_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

-- Merge Requests: Follow document access
CREATE POLICY "Users can view merge requests for accessible documents"
  ON merge_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN projects p ON d.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE d.id = merge_requests.document_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create merge requests for accessible documents"
  ON merge_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN projects p ON d.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE d.id = merge_requests.document_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Users can update their own merge requests"
  ON merge_requests FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update any merge request"
  ON merge_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN projects p ON d.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE d.id = merge_requests.document_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Merge Request Comments: Follow merge request access
CREATE POLICY "Users can view comments for accessible merge requests"
  ON merge_request_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merge_requests mr
      JOIN documents d ON mr.document_id = d.id
      JOIN projects p ON d.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE mr.id = merge_request_comments.merge_request_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on accessible merge requests"
  ON merge_request_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM merge_requests mr
      JOIN documents d ON mr.document_id = d.id
      JOIN projects p ON d.project_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE mr.id = merge_request_comments.merge_request_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments"
  ON merge_request_comments FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get the latest snapshot for a branch
CREATE OR REPLACE FUNCTION get_latest_snapshot(p_branch_id UUID)
RETURNS doc_snapshots AS $$
  SELECT *
  FROM doc_snapshots
  WHERE branch_id = p_branch_id
  ORDER BY version_number DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Function to get the next version number for a branch
CREATE OR REPLACE FUNCTION get_next_version_number(p_document_id UUID, p_branch_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(version_number), 0) + 1
  FROM doc_snapshots
  WHERE document_id = p_document_id
  AND branch_id = p_branch_id;
$$ LANGUAGE SQL STABLE;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for merge_requests (drop first if exists)
DROP TRIGGER IF EXISTS update_merge_requests_updated_at ON merge_requests;
CREATE TRIGGER update_merge_requests_updated_at
  BEFORE UPDATE ON merge_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for merge_request_comments (drop first if exists)
DROP TRIGGER IF EXISTS update_merge_request_comments_updated_at ON merge_request_comments;
CREATE TRIGGER update_merge_request_comments_updated_at
  BEFORE UPDATE ON merge_request_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
