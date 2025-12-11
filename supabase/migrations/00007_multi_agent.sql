-- =============================================================================
-- Migration: 00007_multi_agent.sql
-- Description: Multi-agent reasoning system
-- =============================================================================

-- =============================================================================
-- 1. AGENT DEFINITIONS
-- =============================================================================

create type agent_type as enum (
  'evidence',
  'fact_checker',
  'argument',
  'summarizer',
  'contradiction',
  'research',
  'writer',
  'critic',
  'custom'
);

create type agent_status as enum (
  'idle',
  'running',
  'completed',
  'failed',
  'paused'
);

create table agent_definitions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,

  -- Agent identity
  name text not null,
  agent_type agent_type not null,
  description text,

  -- Configuration
  system_prompt text not null,
  model text default 'claude-sonnet-4-20250514',
  temperature float default 0.7,
  max_tokens int default 2000,

  -- Capabilities
  can_search_sources boolean default false,
  can_search_entities boolean default false,
  can_create_entities boolean default false,
  can_modify_document boolean default false,

  -- Default agents are system-wide
  is_default boolean default false,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_agent_defs_workspace on agent_definitions(workspace_id);
create index idx_agent_defs_type on agent_definitions(agent_type);

-- =============================================================================
-- 2. AGENT PIPELINES
-- =============================================================================

create table agent_pipelines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,

  name text not null,
  description text,

  -- Pipeline configuration
  steps jsonb not null, -- Array of {agent_id, input_mapping, output_mapping}
  parallel_groups jsonb default '[]', -- Groups of steps that can run in parallel

  -- Triggers
  trigger_type text default 'manual', -- manual, on_document_save, scheduled
  trigger_config jsonb default '{}',

  is_active boolean default true,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_pipelines_workspace on agent_pipelines(workspace_id);

-- =============================================================================
-- 3. AGENT EXECUTIONS
-- =============================================================================

create table agent_executions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,

  -- What triggered this
  pipeline_id uuid references agent_pipelines(id) on delete set null,
  agent_id uuid references agent_definitions(id) on delete set null,

  -- Context
  document_id uuid references documents(id) on delete set null,
  input_data jsonb not null,

  -- Status
  status agent_status default 'idle',
  started_at timestamptz,
  completed_at timestamptz,

  -- Results
  output_data jsonb,
  confidence float,
  token_usage jsonb default '{}',

  -- Error handling
  error_message text,
  retry_count int default 0,

  created_at timestamptz default now()
);

create index idx_executions_workspace on agent_executions(workspace_id);
create index idx_executions_pipeline on agent_executions(pipeline_id);
create index idx_executions_status on agent_executions(status);

-- =============================================================================
-- 4. AGENT REASONING TRACES
-- =============================================================================

create table reasoning_traces (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid references agent_executions(id) on delete cascade not null,

  -- Step in the reasoning
  step_number int not null,
  step_type text not null, -- 'thought', 'action', 'observation', 'conclusion'

  -- Content
  content text not null,

  -- Sources used
  sources_consulted jsonb default '[]',
  entities_referenced jsonb default '[]',

  -- Timing
  started_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz default now()
);

create index idx_traces_execution on reasoning_traces(execution_id);

-- =============================================================================
-- 5. AGENT HANDOFFS
-- =============================================================================

create table agent_handoffs (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid references agent_pipelines(id) on delete cascade not null,

  from_execution_id uuid references agent_executions(id) on delete cascade not null,
  to_execution_id uuid references agent_executions(id) on delete cascade not null,

  -- What was passed
  context_passed jsonb not null,
  instructions text,

  created_at timestamptz default now()
);

create index idx_handoffs_pipeline on agent_handoffs(pipeline_id);

-- =============================================================================
-- 6. AGENT DISAGREEMENTS
-- =============================================================================

create table agent_disagreements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  pipeline_id uuid references agent_pipelines(id) on delete set null,

  -- The disagreeing agents
  agent_a_execution_id uuid references agent_executions(id) on delete cascade not null,
  agent_b_execution_id uuid references agent_executions(id) on delete cascade not null,

  -- Details
  topic text not null,
  agent_a_position text not null,
  agent_b_position text not null,

  -- Resolution
  resolution text,
  resolved_by text, -- 'user', 'arbitration_agent', 'voting'
  resolved_at timestamptz,

  created_at timestamptz default now()
);

create index idx_disagreements_workspace on agent_disagreements(workspace_id);

-- =============================================================================
-- 7. ROW LEVEL SECURITY
-- =============================================================================

alter table agent_definitions enable row level security;
alter table agent_pipelines enable row level security;
alter table agent_executions enable row level security;
alter table reasoning_traces enable row level security;
alter table agent_handoffs enable row level security;
alter table agent_disagreements enable row level security;

-- Agent definitions
create policy "agent_defs_select" on agent_definitions for select using (
  is_default or workspace_id is null or get_workspace_role(workspace_id) is not null
);
create policy "agent_defs_insert" on agent_definitions for insert with check (
  workspace_id is null or get_workspace_role(workspace_id) in ('owner', 'admin')
);
create policy "agent_defs_update" on agent_definitions for update using (
  workspace_id is null or get_workspace_role(workspace_id) in ('owner', 'admin')
);

-- Pipelines
create policy "pipelines_select" on agent_pipelines for select using (
  get_workspace_role(workspace_id) is not null
);
create policy "pipelines_insert" on agent_pipelines for insert with check (
  get_workspace_role(workspace_id) in ('owner', 'admin')
);
create policy "pipelines_update" on agent_pipelines for update using (
  get_workspace_role(workspace_id) in ('owner', 'admin')
);

-- Executions
create policy "executions_select" on agent_executions for select using (
  get_workspace_role(workspace_id) is not null
);
create policy "executions_insert" on agent_executions for insert with check (
  get_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
);

-- Reasoning traces
create policy "traces_select" on reasoning_traces for select using (
  exists (select 1 from agent_executions ae where ae.id = reasoning_traces.execution_id and get_workspace_role(ae.workspace_id) is not null)
);

-- Handoffs
create policy "handoffs_select" on agent_handoffs for select using (
  exists (select 1 from agent_pipelines ap where ap.id = agent_handoffs.pipeline_id and get_workspace_role(ap.workspace_id) is not null)
);

-- Disagreements
create policy "disagreements_select" on agent_disagreements for select using (
  get_workspace_role(workspace_id) is not null
);

-- =============================================================================
-- 8. DEFAULT AGENTS
-- =============================================================================

insert into agent_definitions (name, agent_type, description, system_prompt, is_default, can_search_sources, can_search_entities) values
('Evidence Agent', 'evidence', 'Gathers relevant evidence from sources to support or refute claims',
'You are an Evidence Agent. Your role is to search through available sources and find relevant evidence for the given query or claim. Always cite your sources precisely and rate the relevance of each piece of evidence you find. Be thorough but focused.',
true, true, true),

('Fact Checker', 'fact_checker', 'Verifies factual claims against available sources',
'You are a Fact Checking Agent. Your role is to verify claims by cross-referencing with available sources. For each claim, determine: (1) Whether it can be verified, (2) Supporting or contradicting evidence, (3) Confidence level. Be objective and thorough.',
true, true, true),

('Argument Analyst', 'argument', 'Analyzes and structures arguments, identifies logical issues',
'You are an Argument Analysis Agent. Your role is to analyze arguments for logical structure, identify premises and conclusions, detect logical fallacies, and suggest improvements. Be precise in your analysis and constructive in your feedback.',
true, false, true),

('Summarizer', 'summarizer', 'Creates layered summaries at different levels of detail',
'You are a Summarization Agent. Your role is to create clear, accurate summaries at various levels of detail. Always preserve key information and maintain the original meaning. Highlight the most important points.',
true, true, false),

('Contradiction Detector', 'contradiction', 'Identifies conflicts and inconsistencies across documents',
'You are a Contradiction Detection Agent. Your role is to identify conflicts, inconsistencies, and contradictions across documents and claims. For each contradiction found, explain the nature of the conflict and suggest possible resolutions.',
true, true, true);
