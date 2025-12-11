-- =============================================================================
-- Migration: 00006_research_workflows.sql
-- Description: Research workflows, templates, literature reviews, and argumentation
-- =============================================================================

-- =============================================================================
-- 1. LITERATURE REVIEW PIPELINES
-- =============================================================================

create type review_stage as enum (
  'search',
  'screen',
  'extract',
  'synthesize',
  'complete'
);

create type screening_decision as enum (
  'include',
  'exclude',
  'maybe',
  'pending'
);

create table literature_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,

  -- Review details
  title text not null,
  description text,
  research_question text,

  -- PRISMA tracking
  current_stage review_stage default 'search',

  -- Criteria
  inclusion_criteria jsonb default '[]',
  exclusion_criteria jsonb default '[]',
  quality_criteria jsonb default '[]',

  -- Statistics
  total_sources int default 0,
  screened_count int default 0,
  included_count int default 0,
  excluded_count int default 0,

  -- Output document
  output_document_id uuid references documents(id) on delete set null,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_lit_reviews_workspace on literature_reviews(workspace_id);

-- Sources in a literature review
create table review_sources (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references literature_reviews(id) on delete cascade not null,
  source_id uuid references sources(id) on delete cascade not null,

  -- Screening
  screening_decision screening_decision default 'pending',
  screening_notes text,
  screened_by uuid references auth.users(id) on delete set null,
  screened_at timestamptz,

  -- Quality assessment
  quality_score float,
  quality_notes text,

  -- Extraction
  extracted_data jsonb default '{}',
  extraction_complete boolean default false,

  created_at timestamptz default now(),

  unique (review_id, source_id)
);

create index idx_review_sources_review on review_sources(review_id);
create index idx_review_sources_decision on review_sources(screening_decision);

-- =============================================================================
-- 2. RESEARCH TEMPLATES
-- =============================================================================

create type template_type as enum (
  'experiment',
  'hypothesis',
  'methods',
  'results',
  'literature_review',
  'abstract',
  'discussion',
  'custom'
);

create table research_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,

  -- Template details
  name text not null,
  description text,
  template_type template_type not null,

  -- Content
  structure jsonb not null, -- Sections, prompts, fields
  default_content jsonb default '{}',

  -- AI prompts for each section
  ai_prompts jsonb default '{}',

  -- Metadata
  is_public boolean default false,
  use_count int default 0,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_templates_workspace on research_templates(workspace_id);
create index idx_templates_type on research_templates(template_type);

-- Hypotheses tracking
create table hypotheses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  document_id uuid references documents(id) on delete cascade,

  -- Hypothesis
  statement text not null,
  rationale text,

  -- Status
  status text default 'proposed', -- proposed, testing, supported, refuted, inconclusive
  confidence float,

  -- Evidence
  supporting_evidence jsonb default '[]',
  contradicting_evidence jsonb default '[]',

  -- Related
  related_claims jsonb default '[]',

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_hypotheses_workspace on hypotheses(workspace_id);
create index idx_hypotheses_document on hypotheses(document_id);

-- =============================================================================
-- 3. ARGUMENTATION
-- =============================================================================

create type argument_type as enum (
  'claim',
  'premise',
  'evidence',
  'counterargument',
  'rebuttal',
  'conclusion'
);

create type argument_stance as enum (
  'pro',
  'con',
  'neutral'
);

create table argument_maps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  document_id uuid references documents(id) on delete cascade,

  title text not null,
  description text,
  central_claim text,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_arg_maps_workspace on argument_maps(workspace_id);

create table argument_nodes (
  id uuid primary key default gen_random_uuid(),
  map_id uuid references argument_maps(id) on delete cascade not null,
  parent_id uuid references argument_nodes(id) on delete cascade,

  -- Content
  argument_type argument_type not null,
  stance argument_stance default 'neutral',
  content text not null,

  -- Metadata
  strength float default 0.5, -- 0-1 strength of argument
  source_id uuid references sources(id) on delete set null,
  entity_id uuid references knowledge_entities(id) on delete set null,

  -- Position for visualization
  position_x float default 0,
  position_y float default 0,

  created_at timestamptz default now()
);

create index idx_arg_nodes_map on argument_nodes(map_id);
create index idx_arg_nodes_parent on argument_nodes(parent_id);

-- Logical fallacies detection
create table detected_fallacies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  document_id uuid references documents(id) on delete cascade,
  argument_node_id uuid references argument_nodes(id) on delete cascade,

  fallacy_type text not null, -- ad_hominem, straw_man, etc.
  description text not null,
  excerpt text,

  severity text default 'medium', -- low, medium, high
  suggestion text,

  detected_at timestamptz default now()
);

create index idx_fallacies_document on detected_fallacies(document_id);

-- =============================================================================
-- 4. WRITING WORKFLOWS
-- =============================================================================

create type writing_stage as enum (
  'draft',
  'review',
  'revision',
  'finalize',
  'submitted',
  'published'
);

create table writing_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  document_id uuid references documents(id) on delete cascade not null,

  -- Project details
  title text not null,
  target_journal text,
  target_conference text,
  deadline timestamptz,

  -- Stage tracking
  current_stage writing_stage default 'draft',

  -- Checklist
  checklist jsonb default '[]',
  completed_items jsonb default '[]',

  -- Metadata
  word_count_target int,
  current_word_count int default 0,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_writing_projects_workspace on writing_projects(workspace_id);
create index idx_writing_projects_stage on writing_projects(current_stage);

-- Writing feedback/comments specific to stages
create table writing_feedback (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references writing_projects(id) on delete cascade not null,

  stage writing_stage not null,
  feedback_type text not null, -- 'ai_suggestion', 'peer_review', 'self_note'
  content text not null,

  -- Location in document
  section_id uuid references doc_sections(id) on delete set null,
  start_offset int,
  end_offset int,

  resolved boolean default false,
  resolved_at timestamptz,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index idx_writing_feedback_project on writing_feedback(project_id);

-- =============================================================================
-- 5. ROW LEVEL SECURITY
-- =============================================================================

alter table literature_reviews enable row level security;
alter table review_sources enable row level security;
alter table research_templates enable row level security;
alter table hypotheses enable row level security;
alter table argument_maps enable row level security;
alter table argument_nodes enable row level security;
alter table detected_fallacies enable row level security;
alter table writing_projects enable row level security;
alter table writing_feedback enable row level security;

-- Literature reviews
create policy "lit_reviews_select" on literature_reviews for select using (
  get_workspace_role(workspace_id) is not null
);
create policy "lit_reviews_insert" on literature_reviews for insert with check (
  get_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
);
create policy "lit_reviews_update" on literature_reviews for update using (
  get_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
);
create policy "lit_reviews_delete" on literature_reviews for delete using (
  get_workspace_role(workspace_id) in ('owner', 'admin')
);

-- Review sources
create policy "review_sources_select" on review_sources for select using (
  exists (select 1 from literature_reviews lr where lr.id = review_sources.review_id and get_workspace_role(lr.workspace_id) is not null)
);
create policy "review_sources_insert" on review_sources for insert with check (
  exists (select 1 from literature_reviews lr where lr.id = review_sources.review_id and get_workspace_role(lr.workspace_id) in ('owner', 'admin', 'editor'))
);
create policy "review_sources_update" on review_sources for update using (
  exists (select 1 from literature_reviews lr where lr.id = review_sources.review_id and get_workspace_role(lr.workspace_id) in ('owner', 'admin', 'editor'))
);

-- Templates
create policy "templates_select" on research_templates for select using (
  is_public or workspace_id is null or get_workspace_role(workspace_id) is not null
);
create policy "templates_insert" on research_templates for insert with check (
  workspace_id is null or get_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
);

-- Hypotheses
create policy "hypotheses_select" on hypotheses for select using (
  get_workspace_role(workspace_id) is not null
);
create policy "hypotheses_insert" on hypotheses for insert with check (
  get_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
);
create policy "hypotheses_update" on hypotheses for update using (
  get_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
);

-- Argument maps
create policy "arg_maps_select" on argument_maps for select using (
  get_workspace_role(workspace_id) is not null
);
create policy "arg_maps_insert" on argument_maps for insert with check (
  get_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
);
create policy "arg_maps_update" on argument_maps for update using (
  get_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
);

-- Argument nodes
create policy "arg_nodes_select" on argument_nodes for select using (
  exists (select 1 from argument_maps am where am.id = argument_nodes.map_id and get_workspace_role(am.workspace_id) is not null)
);
create policy "arg_nodes_insert" on argument_nodes for insert with check (
  exists (select 1 from argument_maps am where am.id = argument_nodes.map_id and get_workspace_role(am.workspace_id) in ('owner', 'admin', 'editor'))
);

-- Detected fallacies
create policy "fallacies_select" on detected_fallacies for select using (
  get_workspace_role(workspace_id) is not null
);
create policy "fallacies_insert" on detected_fallacies for insert with check (
  get_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
);

-- Writing projects
create policy "writing_projects_select" on writing_projects for select using (
  get_workspace_role(workspace_id) is not null
);
create policy "writing_projects_insert" on writing_projects for insert with check (
  get_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
);
create policy "writing_projects_update" on writing_projects for update using (
  get_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
);

-- Writing feedback
create policy "writing_feedback_select" on writing_feedback for select using (
  exists (select 1 from writing_projects wp where wp.id = writing_feedback.project_id and get_workspace_role(wp.workspace_id) is not null)
);
create policy "writing_feedback_insert" on writing_feedback for insert with check (
  exists (select 1 from writing_projects wp where wp.id = writing_feedback.project_id and get_workspace_role(wp.workspace_id) in ('owner', 'admin', 'editor'))
);
