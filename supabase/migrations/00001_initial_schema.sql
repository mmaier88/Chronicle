-- ResearchBase Initial Schema
-- Migration: 00001_initial_schema
-- Created: 2025-12-10

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- =============================================================================
-- 1. WORKSPACES & MEMBERS
-- =============================================================================

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  slug text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table workspace_members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  invited_at timestamptz default now(),
  joined_at timestamptz,
  primary key (workspace_id, user_id)
);

-- Indexes
create index idx_workspaces_owner on workspaces(owner_id);
create index idx_workspace_members_user on workspace_members(user_id);

-- =============================================================================
-- 2. PROJECTS & DOCUMENTS
-- =============================================================================

create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_projects_workspace on projects(workspace_id);
create index idx_documents_project on documents(project_id);

-- =============================================================================
-- 3. BRANCHING & SECTIONS
-- =============================================================================

create table doc_branches (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  name text not null,
  parent_branch_id uuid references doc_branches(id) on delete set null,
  is_main boolean default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  merged_at timestamptz,
  merged_by uuid references auth.users(id) on delete set null
);

create table doc_sections (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references doc_branches(id) on delete cascade not null,
  order_index int not null,
  title text,
  content_json jsonb default '{}'::jsonb,
  content_text text, -- Plain text for search
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_branches_document on doc_branches(document_id);
create index idx_branches_parent on doc_branches(parent_branch_id);
create index idx_sections_branch on doc_sections(branch_id);
create index idx_sections_order on doc_sections(branch_id, order_index);

-- =============================================================================
-- 4. SOURCES & EMBEDDINGS (Voyage AI)
-- =============================================================================

create table sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  title text,
  original_filename text,
  storage_path text,
  file_size_bytes bigint,
  mime_type text,
  page_count int,
  metadata jsonb default '{}'::jsonb,
  processing_status text default 'pending' check (processing_status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz default now(),
  processed_at timestamptz
);

create table source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete cascade not null,
  chunk_index int not null,
  content text not null,
  page_number int,
  start_char int,
  end_char int,
  embedding vector(1024), -- Voyage AI voyage-3 uses 1024 dimensions
  created_at timestamptz default now()
);

-- Indexes for vector similarity search
create index idx_sources_project on sources(project_id);
create index idx_source_chunks_source on source_chunks(source_id);
create index idx_source_chunks_embedding on source_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- =============================================================================
-- 5. DOCUMENT SECTION EMBEDDINGS (for Ask-Project)
-- =============================================================================

create table doc_section_embeddings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  document_id uuid not null,
  branch_id uuid not null,
  section_id uuid references doc_sections(id) on delete cascade not null,
  content_excerpt text not null,
  embedding vector(1024) not null,
  updated_at timestamptz default now()
);

-- Indexes
create index idx_dse_project on doc_section_embeddings(project_id);
create index idx_dse_section on doc_section_embeddings(section_id);
create index idx_dse_embedding on doc_section_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- =============================================================================
-- 6. CITATIONS & VERIFICATION
-- =============================================================================

create table citations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  document_id uuid not null,
  branch_id uuid not null,
  section_id uuid references doc_sections(id) on delete cascade not null,
  start_offset int not null,
  end_offset int not null,
  source_id uuid references sources(id) on delete cascade not null,
  source_chunk_id uuid references source_chunks(id) on delete set null,
  citation_style text default 'apa',
  formatted_citation text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table citation_verification_runs (
  id uuid primary key default gen_random_uuid(),
  citation_id uuid references citations(id) on delete cascade not null,
  ai_job_id uuid not null,
  supported boolean,
  outdated boolean,
  contradictory boolean,
  confidence_score float,
  notes text,
  checked_at timestamptz default now()
);

-- Indexes
create index idx_citations_section on citations(section_id);
create index idx_citations_source on citations(source_id);
create index idx_citation_verifications on citation_verification_runs(citation_id);

-- =============================================================================
-- 7. AI PROVENANCE & JOB AUDIT
-- =============================================================================

create table ai_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  job_type text not null,
  model_name text not null,
  provider text not null default 'anthropic',
  input_summary text,
  output_summary text,
  input_tokens int,
  output_tokens int,
  cost_usd numeric(10, 6),
  source_chunk_ids uuid[],
  status text default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create type ai_span_source as enum ('llm', 'human', 'paste', 'import');

create table ai_spans (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  branch_id uuid references doc_branches(id) on delete cascade not null,
  section_id uuid references doc_sections(id) on delete cascade not null,
  ai_job_id uuid references ai_jobs(id) on delete set null,
  source ai_span_source default 'llm',
  start_offset int not null,
  end_offset int not null,
  created_at timestamptz default now()
);

-- Indexes
create index idx_ai_jobs_project on ai_jobs(project_id);
create index idx_ai_jobs_user on ai_jobs(user_id);
create index idx_ai_spans_section on ai_spans(section_id);

-- =============================================================================
-- 8. ARGUMENT GRAPH (Claims & Links)
-- =============================================================================

create type claim_type as enum ('claim', 'assumption', 'definition', 'evidence_summary', 'hypothesis');
create type claim_status as enum ('draft', 'reviewed', 'contested', 'verified');

create table claims (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  document_id uuid references documents(id) on delete cascade not null,
  branch_id uuid references doc_branches(id) on delete cascade not null,
  section_id uuid references doc_sections(id) on delete cascade not null,
  claim_type claim_type default 'claim',
  text text not null,
  importance int default 1 check (importance between 1 and 5),
  status claim_status default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table claim_spans (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid references claims(id) on delete cascade not null,
  start_offset int not null,
  end_offset int not null
);

create type claim_relation_type as enum ('supports', 'contradicts', 'depends_on', 'refines', 'extends');

create table claim_links (
  id uuid primary key default gen_random_uuid(),
  from_claim_id uuid references claims(id) on delete cascade not null,
  to_claim_id uuid references claims(id) on delete cascade not null,
  relation claim_relation_type not null,
  explanation text,
  confidence_score float,
  created_at timestamptz default now()
);

create table claim_evidence (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid references claims(id) on delete cascade not null,
  source_chunk_id uuid references source_chunks(id) on delete cascade not null,
  strength_score float default 0.5 check (strength_score between 0 and 1),
  note text,
  created_at timestamptz default now()
);

-- Indexes
create index idx_claims_project on claims(project_id);
create index idx_claims_section on claims(section_id);
create index idx_claim_links_from on claim_links(from_claim_id);
create index idx_claim_links_to on claim_links(to_claim_id);
create index idx_claim_evidence_claim on claim_evidence(claim_id);

-- =============================================================================
-- 9. DOCUMENT SAFETY / RISK ASSESSMENT
-- =============================================================================

create table doc_risk_assessments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  branch_id uuid references doc_branches(id) on delete cascade not null,
  ai_job_id uuid references ai_jobs(id) on delete set null,
  safety_score int check (safety_score between 0 and 100),
  hallucination_risk text check (hallucination_risk in ('low', 'medium', 'high')),
  unsupported_claims int default 0,
  outdated_refs int default 0,
  unverifiable_statements int default 0,
  contradictions int default 0,
  details_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Indexes
create index idx_risk_assessments_document on doc_risk_assessments(document_id);
create index idx_risk_assessments_branch on doc_risk_assessments(branch_id);

-- =============================================================================
-- 10. AUTOMATIONS / WORKFLOWS
-- =============================================================================

create type workflow_type as enum (
  'daily_index_refresh',
  'weekly_exec_summary',
  'weekly_inconsistency_scan',
  'weekly_new_papers_digest',
  'weekly_citation_check',
  'weekly_risk_assessment',
  'on_demand_verify_citations',
  'on_demand_extract_claims'
);

create type workflow_status as enum ('pending', 'running', 'success', 'error', 'cancelled');

create table workflows (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  type workflow_type not null,
  enabled boolean default false,
  schedule_cron text, -- e.g., '0 9 * * 1' for Monday 9am
  config jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references workflows(id) on delete cascade not null,
  status workflow_status default 'pending',
  triggered_by uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  result_summary text,
  error_message text,
  metadata jsonb default '{}'::jsonb
);

-- Indexes
create index idx_workflows_project on workflows(project_id);
create index idx_workflow_runs_workflow on workflow_runs(workflow_id);
create index idx_workflow_runs_status on workflow_runs(status);

-- =============================================================================
-- 11. USER PROFILES (extends auth.users)
-- =============================================================================

create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- 12. HELPER FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger update_workspaces_updated_at before update on workspaces
  for each row execute function update_updated_at_column();

create trigger update_projects_updated_at before update on projects
  for each row execute function update_updated_at_column();

create trigger update_documents_updated_at before update on documents
  for each row execute function update_updated_at_column();

create trigger update_doc_sections_updated_at before update on doc_sections
  for each row execute function update_updated_at_column();

create trigger update_claims_updated_at before update on claims
  for each row execute function update_updated_at_column();

create trigger update_workflows_updated_at before update on workflows
  for each row execute function update_updated_at_column();

create trigger update_user_profiles_updated_at before update on user_profiles
  for each row execute function update_updated_at_column();

-- Function to create user profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================================
-- 13. ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table projects enable row level security;
alter table documents enable row level security;
alter table doc_branches enable row level security;
alter table doc_sections enable row level security;
alter table sources enable row level security;
alter table source_chunks enable row level security;
alter table doc_section_embeddings enable row level security;
alter table citations enable row level security;
alter table citation_verification_runs enable row level security;
alter table ai_jobs enable row level security;
alter table ai_spans enable row level security;
alter table claims enable row level security;
alter table claim_spans enable row level security;
alter table claim_links enable row level security;
alter table claim_evidence enable row level security;
alter table doc_risk_assessments enable row level security;
alter table workflows enable row level security;
alter table workflow_runs enable row level security;
alter table user_profiles enable row level security;

-- Helper function to check workspace membership
create or replace function is_workspace_member(workspace_uuid uuid)
returns boolean as $$
begin
  return exists (
    select 1 from workspace_members
    where workspace_id = workspace_uuid
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Helper function to check workspace role
create or replace function get_workspace_role(workspace_uuid uuid)
returns text as $$
begin
  return (
    select role from workspace_members
    where workspace_id = workspace_uuid
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Workspaces policies
create policy "Users can view workspaces they belong to"
  on workspaces for select
  using (is_workspace_member(id) or owner_id = auth.uid());

create policy "Users can create workspaces"
  on workspaces for insert
  with check (auth.uid() is not null);

create policy "Workspace owners can update"
  on workspaces for update
  using (owner_id = auth.uid() or get_workspace_role(id) in ('owner', 'admin'));

-- Workspace members policies
create policy "Members can view other members"
  on workspace_members for select
  using (is_workspace_member(workspace_id));

create policy "Owners and admins can manage members"
  on workspace_members for all
  using (get_workspace_role(workspace_id) in ('owner', 'admin'));

-- Projects policies
create policy "Workspace members can view projects"
  on projects for select
  using (is_workspace_member(workspace_id));

create policy "Editors can create projects"
  on projects for insert
  with check (get_workspace_role(workspace_id) in ('owner', 'admin', 'editor'));

create policy "Editors can update projects"
  on projects for update
  using (get_workspace_role(workspace_id) in ('owner', 'admin', 'editor'));

-- Documents policies (cascade from projects)
create policy "Project members can view documents"
  on documents for select
  using (exists (
    select 1 from projects p
    where p.id = documents.project_id
    and is_workspace_member(p.workspace_id)
  ));

create policy "Editors can create documents"
  on documents for insert
  with check (exists (
    select 1 from projects p
    where p.id = documents.project_id
    and get_workspace_role(p.workspace_id) in ('owner', 'admin', 'editor')
  ));

create policy "Editors can update documents"
  on documents for update
  using (exists (
    select 1 from projects p
    where p.id = documents.project_id
    and get_workspace_role(p.workspace_id) in ('owner', 'admin', 'editor')
  ));

-- User profiles policies
create policy "Users can view all profiles"
  on user_profiles for select
  using (true);

create policy "Users can update own profile"
  on user_profiles for update
  using (id = auth.uid());

-- =============================================================================
-- DONE
-- =============================================================================
