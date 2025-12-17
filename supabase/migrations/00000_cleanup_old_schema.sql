-- Cleanup Migration: Drop all ResearchBase tables and types
-- This clears the old schema before applying Chronicle schema

-- Drop old ResearchBase tables (in dependency order)
DROP TABLE IF EXISTS ai_jobs CASCADE;
DROP TABLE IF EXISTS embeddings CASCADE;
DROP TABLE IF EXISTS consistency_reports CASCADE;
DROP TABLE IF EXISTS semantic_blocks CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS chapters CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS doc_branches CASCADE;
DROP TABLE IF EXISTS doc_versions CASCADE;
DROP TABLE IF EXISTS merge_requests CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop old ResearchBase types
DROP TYPE IF EXISTS book_status CASCADE;
DROP TYPE IF EXISTS book_genre CASCADE;
DROP TYPE IF EXISTS content_status CASCADE;
DROP TYPE IF EXISTS milestone_version CASCADE;
DROP TYPE IF EXISTS claim_block_type CASCADE;
DROP TYPE IF EXISTS claim_stance CASCADE;
DROP TYPE IF EXISTS workspace_role CASCADE;
DROP TYPE IF EXISTS merge_status CASCADE;
DROP TYPE IF EXISTS version_type CASCADE;
DROP TYPE IF EXISTS branch_status CASCADE;

-- Drop old functions and triggers
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;
DROP FUNCTION IF EXISTS search_book_embeddings CASCADE;
DROP FUNCTION IF EXISTS create_default_branch CASCADE;
