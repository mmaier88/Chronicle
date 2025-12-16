-- =============================================================================
-- Fix: Add WITH CHECK clause for INSERT on doc_branches and doc_sections
-- =============================================================================
-- The previous migration used FOR ALL with only USING, but INSERT needs WITH CHECK.
-- This fixes document creation failing due to RLS policy violations.
-- =============================================================================

-- Drop the broken policies
DROP POLICY IF EXISTS "Editors can manage branches" ON doc_branches;
DROP POLICY IF EXISTS "Editors can manage sections" ON doc_sections;

-- doc_branches: Separate policies for different operations
CREATE POLICY "Editors can select branches"
  ON doc_branches FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM documents d
    JOIN projects p ON p.id = d.project_id
    WHERE d.id = doc_branches.document_id
    AND get_workspace_role(p.workspace_id) IN ('owner', 'admin', 'editor', 'reviewer', 'viewer')
  ));

CREATE POLICY "Editors can insert branches"
  ON doc_branches FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM documents d
    JOIN projects p ON p.id = d.project_id
    WHERE d.id = document_id
    AND get_workspace_role(p.workspace_id) IN ('owner', 'admin', 'editor')
  ));

CREATE POLICY "Editors can update branches"
  ON doc_branches FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM documents d
    JOIN projects p ON p.id = d.project_id
    WHERE d.id = doc_branches.document_id
    AND get_workspace_role(p.workspace_id) IN ('owner', 'admin', 'editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM documents d
    JOIN projects p ON p.id = d.project_id
    WHERE d.id = document_id
    AND get_workspace_role(p.workspace_id) IN ('owner', 'admin', 'editor')
  ));

CREATE POLICY "Editors can delete branches"
  ON doc_branches FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM documents d
    JOIN projects p ON p.id = d.project_id
    WHERE d.id = doc_branches.document_id
    AND get_workspace_role(p.workspace_id) IN ('owner', 'admin', 'editor')
  ));

-- doc_sections: Separate policies for different operations
CREATE POLICY "Editors can select sections"
  ON doc_sections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM doc_branches b
    JOIN documents d ON d.id = b.document_id
    JOIN projects p ON p.id = d.project_id
    WHERE b.id = doc_sections.branch_id
    AND get_workspace_role(p.workspace_id) IN ('owner', 'admin', 'editor', 'reviewer', 'viewer')
  ));

CREATE POLICY "Editors can insert sections"
  ON doc_sections FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM doc_branches b
    JOIN documents d ON d.id = b.document_id
    JOIN projects p ON p.id = d.project_id
    WHERE b.id = branch_id
    AND get_workspace_role(p.workspace_id) IN ('owner', 'admin', 'editor')
  ));

CREATE POLICY "Editors can update sections"
  ON doc_sections FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM doc_branches b
    JOIN documents d ON d.id = b.document_id
    JOIN projects p ON p.id = d.project_id
    WHERE b.id = doc_sections.branch_id
    AND get_workspace_role(p.workspace_id) IN ('owner', 'admin', 'editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM doc_branches b
    JOIN documents d ON d.id = b.document_id
    JOIN projects p ON p.id = d.project_id
    WHERE b.id = branch_id
    AND get_workspace_role(p.workspace_id) IN ('owner', 'admin', 'editor')
  ));

CREATE POLICY "Editors can delete sections"
  ON doc_sections FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM doc_branches b
    JOIN documents d ON d.id = b.document_id
    JOIN projects p ON p.id = d.project_id
    WHERE b.id = doc_sections.branch_id
    AND get_workspace_role(p.workspace_id) IN ('owner', 'admin', 'editor')
  ));

-- Also drop the duplicate SELECT policies from migration 00009
DROP POLICY IF EXISTS "Document members can view branches" ON doc_branches;
DROP POLICY IF EXISTS "Document members can view sections" ON doc_sections;
