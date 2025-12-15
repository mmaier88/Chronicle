-- Migration: Fix workflows schema to match API expectations
-- The API uses workflow_type but DB has type column

-- Rename type column to workflow_type
ALTER TABLE workflows RENAME COLUMN type TO workflow_type;

-- Add missing columns for run tracking
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS last_run_at timestamptz;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS next_run_at timestamptz;

-- Rename schedule_cron to schedule for consistency
ALTER TABLE workflows RENAME COLUMN schedule_cron TO schedule;

-- Add unique constraint for upsert to work properly
ALTER TABLE workflows DROP CONSTRAINT IF EXISTS workflows_project_workflow_type_unique;
ALTER TABLE workflows ADD CONSTRAINT workflows_project_workflow_type_unique
  UNIQUE (project_id, workflow_type);

-- Update RLS policies if they reference old column name
DROP POLICY IF EXISTS "Users can view workflows in their projects" ON workflows;
CREATE POLICY "Users can view workflows in their projects"
  ON workflows FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage workflows in their projects" ON workflows;
CREATE POLICY "Users can manage workflows in their projects"
  ON workflows FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'editor')
    )
  );
