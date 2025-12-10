-- ResearchBase Teams & Access Control
-- Migration: 00003_teams_and_access_control
-- Phase 11 Implementation
-- Created: 2025-12-10

-- Enable pgcrypto for secure token generation
create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. EXTEND ROLES - Add 'reviewer' role
-- =============================================================================

-- Update the check constraint on workspace_members to include 'reviewer'
alter table workspace_members drop constraint if exists workspace_members_role_check;
alter table workspace_members add constraint workspace_members_role_check
  check (role in ('owner', 'admin', 'editor', 'reviewer', 'viewer'));

-- =============================================================================
-- 2. WORKSPACE INVITATIONS
-- =============================================================================

create table workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  email text not null,
  role text not null check (role in ('admin', 'editor', 'reviewer', 'viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  token text unique not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz default now(),

  -- Prevent duplicate pending invitations
  unique (workspace_id, email)
);

create index idx_invitations_workspace on workspace_invitations(workspace_id);
create index idx_invitations_email on workspace_invitations(email);
create index idx_invitations_token on workspace_invitations(token);

-- =============================================================================
-- 3. PROJECT-LEVEL PERMISSIONS (override workspace role)
-- =============================================================================

create table project_permissions (
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'reviewer', 'viewer', 'none')),
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz default now(),
  primary key (project_id, user_id)
);

create index idx_project_permissions_user on project_permissions(user_id);

-- =============================================================================
-- 4. DOCUMENT-LEVEL PERMISSIONS (override project role)
-- =============================================================================

create table document_permissions (
  document_id uuid references documents(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('editor', 'reviewer', 'viewer', 'none')),
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz default now(),
  primary key (document_id, user_id)
);

create index idx_document_permissions_user on document_permissions(user_id);

-- =============================================================================
-- 5. DOCUMENT SECTIONS LOCKING
-- =============================================================================

create table section_locks (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references doc_sections(id) on delete cascade not null,
  locked_by uuid references auth.users(id) on delete cascade not null,
  reason text,
  locked_at timestamptz default now(),
  expires_at timestamptz, -- null = permanent until manually unlocked

  unique (section_id) -- Only one lock per section
);

-- =============================================================================
-- 6. COMMENTS & SUGGESTIONS
-- =============================================================================

create type comment_type as enum ('comment', 'suggestion', 'question', 'approval');
create type comment_status as enum ('open', 'resolved', 'rejected');

create table document_comments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  branch_id uuid references doc_branches(id) on delete cascade not null,
  section_id uuid references doc_sections(id) on delete cascade,
  parent_id uuid references document_comments(id) on delete cascade, -- For replies

  comment_type comment_type default 'comment',
  status comment_status default 'open',

  -- Position in document (for inline comments)
  start_offset int,
  end_offset int,

  -- For suggestions: the proposed replacement text
  suggested_text text,

  content text not null,
  author_id uuid references auth.users(id) on delete set null not null,

  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_comments_document on document_comments(document_id);
create index idx_comments_section on document_comments(section_id);
create index idx_comments_author on document_comments(author_id);
create index idx_comments_parent on document_comments(parent_id);
create index idx_comments_status on document_comments(status) where status = 'open';

-- =============================================================================
-- 7. APPROVAL WORKFLOWS
-- =============================================================================

create type approval_status as enum ('pending', 'approved', 'rejected', 'changes_requested');

create table document_approvals (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  branch_id uuid references doc_branches(id) on delete cascade not null,

  requested_by uuid references auth.users(id) on delete set null not null,
  requested_at timestamptz default now(),

  title text not null,
  description text,

  status approval_status default 'pending',

  -- Snapshot of document state at request time
  snapshot_content_hash text,

  completed_at timestamptz
);

create table approval_reviewers (
  approval_id uuid references document_approvals(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete cascade,
  status approval_status default 'pending',
  feedback text,
  reviewed_at timestamptz,
  primary key (approval_id, reviewer_id)
);

create index idx_approvals_document on document_approvals(document_id);
create index idx_approvals_status on document_approvals(status) where status = 'pending';
create index idx_approval_reviewers_reviewer on approval_reviewers(reviewer_id);

-- =============================================================================
-- 8. ACTIVITY AUDIT LOG
-- =============================================================================

create type activity_action as enum (
  -- Workspace actions
  'workspace.create', 'workspace.update', 'workspace.delete',
  'workspace.member_add', 'workspace.member_remove', 'workspace.member_role_change',
  'workspace.invite_send', 'workspace.invite_accept', 'workspace.invite_revoke',

  -- Project actions
  'project.create', 'project.update', 'project.delete',
  'project.permission_change',

  -- Document actions
  'document.create', 'document.update', 'document.delete',
  'document.permission_change',
  'document.branch_create', 'document.branch_merge',
  'document.section_lock', 'document.section_unlock',

  -- Collaboration actions
  'comment.create', 'comment.resolve', 'comment.delete',
  'suggestion.create', 'suggestion.accept', 'suggestion.reject',
  'approval.request', 'approval.approve', 'approval.reject',

  -- Source actions
  'source.upload', 'source.process', 'source.delete',

  -- AI actions
  'ai.edit', 'ai.ask', 'ai.verify', 'ai.extract_claims', 'ai.assess_safety'
);

create table activity_log (
  id uuid primary key default gen_random_uuid(),

  -- Context
  workspace_id uuid references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,

  -- Actor
  user_id uuid references auth.users(id) on delete set null,

  -- Action
  action activity_action not null,

  -- Details (flexible JSON for action-specific data)
  details jsonb default '{}'::jsonb,

  -- Target entity (for quick filtering)
  target_type text, -- 'workspace', 'project', 'document', 'member', 'comment', etc.
  target_id uuid,

  -- IP and user agent for security audit
  ip_address inet,
  user_agent text,

  created_at timestamptz default now()
);

-- Indexes for efficient querying
create index idx_activity_workspace on activity_log(workspace_id, created_at desc);
create index idx_activity_project on activity_log(project_id, created_at desc);
create index idx_activity_document on activity_log(document_id, created_at desc);
create index idx_activity_user on activity_log(user_id, created_at desc);
create index idx_activity_action on activity_log(action);
create index idx_activity_created on activity_log(created_at desc);

-- =============================================================================
-- 9. HELPER FUNCTIONS FOR PERMISSIONS
-- =============================================================================

-- Get effective role for a project (considering workspace role and project override)
create or replace function get_project_role(project_uuid uuid)
returns text as $$
declare
  workspace_uuid uuid;
  workspace_role text;
  project_role text;
begin
  -- Get workspace_id for this project
  select workspace_id into workspace_uuid from projects where id = project_uuid;

  -- Get workspace role
  workspace_role := get_workspace_role(workspace_uuid);

  -- Check for project-level override
  select role into project_role
  from project_permissions
  where project_id = project_uuid and user_id = auth.uid();

  -- If project permission is 'none', user has no access
  if project_role = 'none' then
    return null;
  end if;

  -- Return project role if set, otherwise workspace role
  return coalesce(project_role, workspace_role);
end;
$$ language plpgsql security definer;

-- Get effective role for a document (considering project role and document override)
create or replace function get_document_role(document_uuid uuid)
returns text as $$
declare
  project_uuid uuid;
  project_role text;
  document_role text;
begin
  -- Get project_id for this document
  select project_id into project_uuid from documents where id = document_uuid;

  -- Get project role
  project_role := get_project_role(project_uuid);

  -- Check for document-level override
  select role into document_role
  from document_permissions
  where document_id = document_uuid and user_id = auth.uid();

  -- If document permission is 'none', user has no access
  if document_role = 'none' then
    return null;
  end if;

  -- Return document role if set, otherwise project role
  return coalesce(document_role, project_role);
end;
$$ language plpgsql security definer;

-- Check if user can edit a document
create or replace function can_edit_document(document_uuid uuid)
returns boolean as $$
begin
  return get_document_role(document_uuid) in ('owner', 'admin', 'editor');
end;
$$ language plpgsql security definer;

-- Check if user can review a document (reviewer or higher)
create or replace function can_review_document(document_uuid uuid)
returns boolean as $$
begin
  return get_document_role(document_uuid) in ('owner', 'admin', 'editor', 'reviewer');
end;
$$ language plpgsql security definer;

-- =============================================================================
-- 10. ROW LEVEL SECURITY FOR NEW TABLES
-- =============================================================================

alter table workspace_invitations enable row level security;
alter table project_permissions enable row level security;
alter table document_permissions enable row level security;
alter table section_locks enable row level security;
alter table document_comments enable row level security;
alter table document_approvals enable row level security;
alter table approval_reviewers enable row level security;
alter table activity_log enable row level security;

-- Invitations: admins can manage, users can view their own
create policy "Admins can manage invitations"
  on workspace_invitations for all
  using (get_workspace_role(workspace_id) in ('owner', 'admin'));

create policy "Users can view invitations sent to their email"
  on workspace_invitations for select
  using (email = (select email from auth.users where id = auth.uid()));

-- Project permissions: workspace admins can manage
create policy "Workspace admins can manage project permissions"
  on project_permissions for all
  using (exists (
    select 1 from projects p
    where p.id = project_permissions.project_id
    and get_workspace_role(p.workspace_id) in ('owner', 'admin')
  ));

-- Document permissions: project admins can manage
create policy "Project admins can manage document permissions"
  on document_permissions for all
  using (exists (
    select 1 from documents d
    join projects p on p.id = d.project_id
    where d.id = document_permissions.document_id
    and get_workspace_role(p.workspace_id) in ('owner', 'admin')
  ));

-- Section locks: editors can manage locks they own
create policy "Editors can view all locks"
  on section_locks for select
  using (exists (
    select 1 from doc_sections s
    join doc_branches b on b.id = s.branch_id
    join documents d on d.id = b.document_id
    where s.id = section_locks.section_id
    and can_edit_document(d.id)
  ));

create policy "Editors can create locks"
  on section_locks for insert
  with check (exists (
    select 1 from doc_sections s
    join doc_branches b on b.id = s.branch_id
    join documents d on d.id = b.document_id
    where s.id = section_locks.section_id
    and can_edit_document(d.id)
  ));

create policy "Lock owners or admins can delete locks"
  on section_locks for delete
  using (locked_by = auth.uid() or exists (
    select 1 from doc_sections s
    join doc_branches b on b.id = s.branch_id
    join documents d on d.id = b.document_id
    join projects p on p.id = d.project_id
    where s.id = section_locks.section_id
    and get_workspace_role(p.workspace_id) in ('owner', 'admin')
  ));

-- Comments: reviewers and above can create/view
create policy "Reviewers can view comments"
  on document_comments for select
  using (can_review_document(document_id));

create policy "Reviewers can create comments"
  on document_comments for insert
  with check (can_review_document(document_id));

create policy "Authors can update own comments"
  on document_comments for update
  using (author_id = auth.uid());

create policy "Authors or admins can delete comments"
  on document_comments for delete
  using (author_id = auth.uid() or exists (
    select 1 from documents d
    join projects p on p.id = d.project_id
    where d.id = document_comments.document_id
    and get_workspace_role(p.workspace_id) in ('owner', 'admin')
  ));

-- Approvals: editors can request, reviewers can review
create policy "Editors can view approvals"
  on document_approvals for select
  using (can_review_document(document_id));

create policy "Editors can request approvals"
  on document_approvals for insert
  with check (can_edit_document(document_id));

-- Approval reviewers: reviewers can see and update their own reviews
create policy "Reviewers can view approval reviews"
  on approval_reviewers for select
  using (exists (
    select 1 from document_approvals a
    where a.id = approval_reviewers.approval_id
    and can_review_document(a.document_id)
  ));

create policy "Assigned reviewers can update their review"
  on approval_reviewers for update
  using (reviewer_id = auth.uid());

-- Activity log: members can view activity in their workspaces
create policy "Members can view workspace activity"
  on activity_log for select
  using (
    (workspace_id is not null and is_workspace_member(workspace_id)) or
    (project_id is not null and get_project_role(project_id) is not null) or
    (document_id is not null and get_document_role(document_id) is not null)
  );

-- Only system/service role can insert activity (from API)
create policy "Service role can insert activity"
  on activity_log for insert
  with check (auth.uid() is not null);

-- =============================================================================
-- 11. TRIGGERS FOR ACTIVITY LOGGING
-- =============================================================================

-- Function to log activity
create or replace function log_activity(
  p_action activity_action,
  p_workspace_id uuid default null,
  p_project_id uuid default null,
  p_document_id uuid default null,
  p_target_type text default null,
  p_target_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns uuid as $$
declare
  v_id uuid;
begin
  insert into activity_log (
    workspace_id, project_id, document_id,
    user_id, action, target_type, target_id, details
  ) values (
    p_workspace_id, p_project_id, p_document_id,
    auth.uid(), p_action, p_target_type, p_target_id, p_details
  )
  returning id into v_id;

  return v_id;
end;
$$ language plpgsql security definer;

-- =============================================================================
-- 12. UPDATE TRIGGERS
-- =============================================================================

create trigger update_document_comments_updated_at before update on document_comments
  for each row execute function update_updated_at_column();

-- =============================================================================
-- DONE
-- =============================================================================
