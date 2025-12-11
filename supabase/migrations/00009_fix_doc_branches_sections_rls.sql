-- =============================================================================
-- Fix: Add missing RLS policies for doc_branches and doc_sections
-- =============================================================================
--
-- RLS was enabled on these tables but no policies existed, blocking all operations.
-- =============================================================================

-- doc_branches policies
CREATE POLICY "Document members can view branches"
  ON doc_branches FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM documents d
    JOIN projects p ON p.id = d.project_id
    WHERE d.id = doc_branches.document_id
    AND is_workspace_member(p.workspace_id)
  ));

CREATE POLICY "Editors can manage branches"
  ON doc_branches FOR ALL
  USING (EXISTS (
    SELECT 1 FROM documents d
    JOIN projects p ON p.id = d.project_id
    WHERE d.id = doc_branches.document_id
    AND get_workspace_role(p.workspace_id) IN ('owner', 'admin', 'editor')
  ));

-- doc_sections policies (joins through doc_branches since sections don't have document_id)
CREATE POLICY "Document members can view sections"
  ON doc_sections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM doc_branches b
    JOIN documents d ON d.id = b.document_id
    JOIN projects p ON p.id = d.project_id
    WHERE b.id = doc_sections.branch_id
    AND is_workspace_member(p.workspace_id)
  ));

CREATE POLICY "Editors can manage sections"
  ON doc_sections FOR ALL
  USING (EXISTS (
    SELECT 1 FROM doc_branches b
    JOIN documents d ON d.id = b.document_id
    JOIN projects p ON p.id = d.project_id
    WHERE b.id = doc_sections.branch_id
    AND get_workspace_role(p.workspace_id) IN ('owner', 'admin', 'editor')
  ));
