-- =============================================================================
-- Migration: 00004_knowledge_graph.sql
-- Description: Knowledge graph for cross-document entity and relationship tracking
-- =============================================================================

-- =============================================================================
-- 1. ENTITY TYPES
-- =============================================================================

create type entity_type as enum (
  'person',
  'organization',
  'concept',
  'claim',
  'methodology',
  'finding',
  'dataset',
  'location',
  'event',
  'term',
  'other'
);

create type relationship_type as enum (
  'supports',
  'contradicts',
  'related_to',
  'derived_from',
  'part_of',
  'authored_by',
  'references',
  'defines',
  'uses',
  'causes',
  'precedes',
  'equivalent_to'
);

-- =============================================================================
-- 2. KNOWLEDGE ENTITIES
-- =============================================================================

create table knowledge_entities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,

  -- Entity details
  name text not null,
  normalized_name text not null, -- Lowercase, stripped for deduplication
  entity_type entity_type not null,
  description text,
  aliases text[] default '{}',

  -- Metadata
  properties jsonb default '{}', -- Flexible key-value properties
  confidence float default 1.0 check (confidence between 0 and 1),

  -- Embedding for semantic search
  embedding vector(1024),

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Prevent exact duplicates within workspace
  unique (workspace_id, normalized_name, entity_type)
);

create index idx_entities_workspace on knowledge_entities(workspace_id);
create index idx_entities_type on knowledge_entities(entity_type);
create index idx_entities_name on knowledge_entities(normalized_name);
create index idx_entities_embedding on knowledge_entities using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- =============================================================================
-- 3. ENTITY MENTIONS (where entities appear in documents)
-- =============================================================================

create table entity_mentions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references knowledge_entities(id) on delete cascade not null,

  -- Location in document
  document_id uuid references documents(id) on delete cascade not null,
  branch_id uuid references doc_branches(id) on delete cascade not null,
  section_id uuid references doc_sections(id) on delete cascade,

  -- Position
  start_offset int,
  end_offset int,
  mention_text text not null, -- The actual text that was matched

  -- Context
  context_text text, -- Surrounding text for context

  -- Extraction metadata
  extraction_method text default 'ai', -- 'ai', 'rule', 'manual'
  confidence float default 1.0,

  created_at timestamptz default now()
);

create index idx_mentions_entity on entity_mentions(entity_id);
create index idx_mentions_document on entity_mentions(document_id);
create index idx_mentions_branch on entity_mentions(branch_id);

-- =============================================================================
-- 4. ENTITY RELATIONSHIPS
-- =============================================================================

create table entity_relationships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,

  -- The relationship
  source_entity_id uuid references knowledge_entities(id) on delete cascade not null,
  target_entity_id uuid references knowledge_entities(id) on delete cascade not null,
  relationship_type relationship_type not null,

  -- Details
  description text,
  weight float default 1.0, -- Strength of relationship
  confidence float default 1.0,

  -- Evidence for this relationship
  evidence_document_id uuid references documents(id) on delete set null,
  evidence_text text,

  -- Metadata
  properties jsonb default '{}',

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Prevent duplicate relationships
  unique (source_entity_id, target_entity_id, relationship_type)
);

create index idx_relationships_workspace on entity_relationships(workspace_id);
create index idx_relationships_source on entity_relationships(source_entity_id);
create index idx_relationships_target on entity_relationships(target_entity_id);
create index idx_relationships_type on entity_relationships(relationship_type);

-- =============================================================================
-- 5. CONTRADICTIONS
-- =============================================================================

create type contradiction_status as enum ('detected', 'confirmed', 'resolved', 'dismissed');
create type contradiction_severity as enum ('low', 'medium', 'high', 'critical');

create table contradictions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,

  -- The contradicting claims
  claim_a_entity_id uuid references knowledge_entities(id) on delete cascade not null,
  claim_b_entity_id uuid references knowledge_entities(id) on delete cascade not null,

  -- Contradiction details
  description text not null,
  severity contradiction_severity default 'medium',
  status contradiction_status default 'detected',

  -- Source documents
  document_a_id uuid references documents(id) on delete set null,
  document_b_id uuid references documents(id) on delete set null,

  -- AI analysis
  analysis jsonb default '{}', -- Detailed AI analysis of contradiction
  resolution_suggestion text,

  -- Resolution
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolution_notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_contradictions_workspace on contradictions(workspace_id);
create index idx_contradictions_status on contradictions(status);
create index idx_contradictions_severity on contradictions(severity);

-- =============================================================================
-- 6. KNOWLEDGE GRAPH SNAPSHOTS (for versioning)
-- =============================================================================

create table graph_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,

  name text not null,
  description text,

  -- Snapshot data
  entity_count int default 0,
  relationship_count int default 0,
  snapshot_data jsonb not null, -- Serialized graph state

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index idx_snapshots_workspace on graph_snapshots(workspace_id);

-- =============================================================================
-- 7. ROW LEVEL SECURITY
-- =============================================================================

alter table knowledge_entities enable row level security;
alter table entity_mentions enable row level security;
alter table entity_relationships enable row level security;
alter table contradictions enable row level security;
alter table graph_snapshots enable row level security;

-- Knowledge entities: workspace members can view
create policy "knowledge_entities_select" on knowledge_entities for select using (
  get_workspace_role(workspace_id) is not null
);

create policy "knowledge_entities_insert" on knowledge_entities for insert with check (
  get_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
);

create policy "knowledge_entities_update" on knowledge_entities for update using (
  get_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
);

create policy "knowledge_entities_delete" on knowledge_entities for delete using (
  get_workspace_role(workspace_id) in ('owner', 'admin')
);

-- Entity mentions: follow entity permissions
create policy "entity_mentions_select" on entity_mentions for select using (
  exists (
    select 1 from knowledge_entities e
    where e.id = entity_mentions.entity_id
    and get_workspace_role(e.workspace_id) is not null
  )
);

create policy "entity_mentions_insert" on entity_mentions for insert with check (
  exists (
    select 1 from knowledge_entities e
    where e.id = entity_mentions.entity_id
    and get_workspace_role(e.workspace_id) in ('owner', 'admin', 'editor')
  )
);

-- Entity relationships: workspace members can view
create policy "entity_relationships_select" on entity_relationships for select using (
  get_workspace_role(workspace_id) is not null
);

create policy "entity_relationships_insert" on entity_relationships for insert with check (
  get_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
);

-- Contradictions: workspace members can view
create policy "contradictions_select" on contradictions for select using (
  get_workspace_role(workspace_id) is not null
);

create policy "contradictions_insert" on contradictions for insert with check (
  get_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
);

create policy "contradictions_update" on contradictions for update using (
  get_workspace_role(workspace_id) in ('owner', 'admin', 'editor')
);

-- Graph snapshots: workspace members can view
create policy "graph_snapshots_select" on graph_snapshots for select using (
  get_workspace_role(workspace_id) is not null
);

create policy "graph_snapshots_insert" on graph_snapshots for insert with check (
  get_workspace_role(workspace_id) in ('owner', 'admin')
);

-- =============================================================================
-- 8. HELPER FUNCTIONS
-- =============================================================================

-- Normalize entity name for deduplication
create or replace function normalize_entity_name(name text)
returns text as $$
begin
  return lower(trim(regexp_replace(name, '\s+', ' ', 'g')));
end;
$$ language plpgsql immutable;

-- Find similar entities by name
create or replace function find_similar_entities(
  p_workspace_id uuid,
  p_name text,
  p_entity_type entity_type default null,
  p_threshold float default 0.8
)
returns table (
  entity_id uuid,
  entity_name text,
  entity_type entity_type,
  similarity float
) as $$
begin
  return query
  select
    e.id,
    e.name,
    e.entity_type,
    similarity(e.normalized_name, normalize_entity_name(p_name)) as sim
  from knowledge_entities e
  where e.workspace_id = p_workspace_id
    and (p_entity_type is null or e.entity_type = p_entity_type)
    and similarity(e.normalized_name, normalize_entity_name(p_name)) > p_threshold
  order by sim desc
  limit 10;
end;
$$ language plpgsql security definer;

-- Get entity relationship graph
create or replace function get_entity_graph(
  p_workspace_id uuid,
  p_center_entity_id uuid default null,
  p_depth int default 2,
  p_limit int default 100
)
returns jsonb as $$
declare
  result jsonb;
begin
  with recursive entity_graph as (
    -- Base case: start from center entity or all entities
    select
      e.id,
      e.name,
      e.entity_type,
      0 as depth
    from knowledge_entities e
    where e.workspace_id = p_workspace_id
      and (p_center_entity_id is null or e.id = p_center_entity_id)

    union

    -- Recursive case: follow relationships
    select
      e2.id,
      e2.name,
      e2.entity_type,
      eg.depth + 1
    from entity_graph eg
    join entity_relationships r on (r.source_entity_id = eg.id or r.target_entity_id = eg.id)
    join knowledge_entities e2 on (
      e2.id = case when r.source_entity_id = eg.id then r.target_entity_id else r.source_entity_id end
    )
    where eg.depth < p_depth
      and e2.workspace_id = p_workspace_id
  )
  select jsonb_build_object(
    'nodes', (
      select jsonb_agg(distinct jsonb_build_object(
        'id', eg.id,
        'name', eg.name,
        'type', eg.entity_type
      ))
      from entity_graph eg
      limit p_limit
    ),
    'edges', (
      select jsonb_agg(distinct jsonb_build_object(
        'source', r.source_entity_id,
        'target', r.target_entity_id,
        'type', r.relationship_type,
        'weight', r.weight
      ))
      from entity_relationships r
      where r.workspace_id = p_workspace_id
        and exists (select 1 from entity_graph eg where eg.id = r.source_entity_id)
        and exists (select 1 from entity_graph eg where eg.id = r.target_entity_id)
    )
  ) into result;

  return result;
end;
$$ language plpgsql security definer;

-- Trigger to update normalized_name
create or replace function update_normalized_name()
returns trigger as $$
begin
  new.normalized_name := normalize_entity_name(new.name);
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger knowledge_entities_normalize
  before insert or update on knowledge_entities
  for each row execute function update_normalized_name();
