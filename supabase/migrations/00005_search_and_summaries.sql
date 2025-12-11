-- =============================================================================
-- Migration: 00005_search_and_summaries.sql
-- Description: Global search, saved searches, workspace summaries, and activity feed
-- =============================================================================

-- =============================================================================
-- 1. SAVED SEARCHES
-- =============================================================================

create table saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  workspace_id uuid references workspaces(id) on delete cascade,

  name text not null,
  query text not null,
  filters jsonb default '{}',

  -- Notifications
  notify_on_new boolean default false,
  last_run_at timestamptz,
  last_result_count int default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_saved_searches_user on saved_searches(user_id);
create index idx_saved_searches_workspace on saved_searches(workspace_id);

-- =============================================================================
-- 2. WORKSPACE SUMMARIES
-- =============================================================================

create type summary_type as enum ('weekly', 'monthly', 'custom');

create table workspace_summaries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,

  summary_type summary_type not null,
  period_start timestamptz not null,
  period_end timestamptz not null,

  -- Summary content
  summary_text text not null,
  key_findings jsonb default '[]',
  new_documents int default 0,
  new_sources int default 0,
  new_entities int default 0,
  new_contradictions int default 0,
  active_users jsonb default '[]',

  -- AI analysis
  trends jsonb default '[]',
  recommendations jsonb default '[]',

  generated_by text default 'ai',
  created_at timestamptz default now()
);

create index idx_summaries_workspace on workspace_summaries(workspace_id);
create index idx_summaries_period on workspace_summaries(period_start, period_end);

-- =============================================================================
-- 3. ACTIVITY FEED
-- =============================================================================

create table if not exists activity_feed (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,

  -- Activity details
  action text not null,
  target_type text not null, -- 'document', 'source', 'entity', 'branch', etc.
  target_id uuid,
  target_title text,

  -- Context
  details jsonb default '{}',

  created_at timestamptz default now()
);

create index if not exists idx_activity_workspace on activity_feed(workspace_id);
create index if not exists idx_activity_user on activity_feed(user_id);
create index if not exists idx_activity_created on activity_feed(created_at desc);
create index if not exists idx_activity_target on activity_feed(target_type, target_id);

-- =============================================================================
-- 4. NOTIFICATION PREFERENCES
-- =============================================================================

create table notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  workspace_id uuid references workspaces(id) on delete cascade,

  -- Email notifications
  email_weekly_summary boolean default true,
  email_contradictions boolean default true,
  email_mentions boolean default true,
  email_document_changes boolean default false,

  -- In-app notifications
  inapp_contradictions boolean default true,
  inapp_mentions boolean default true,
  inapp_document_changes boolean default true,

  -- Digest preferences
  digest_day text default 'monday', -- Day of week for weekly digest
  digest_time text default '09:00', -- Time in UTC

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (user_id, workspace_id)
);

create index idx_notif_prefs_user on notification_preferences(user_id);

-- =============================================================================
-- 5. NOTIFICATIONS
-- =============================================================================

create type notification_status as enum ('unread', 'read', 'dismissed');

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  workspace_id uuid references workspaces(id) on delete cascade,

  -- Notification content
  title text not null,
  body text,
  notification_type text not null, -- 'contradiction', 'mention', 'summary', 'search_alert'

  -- Link
  link_type text, -- 'document', 'entity', 'contradiction', 'workspace'
  link_id uuid,

  status notification_status default 'unread',

  created_at timestamptz default now(),
  read_at timestamptz
);

create index idx_notifications_user on notifications(user_id);
create index idx_notifications_status on notifications(user_id, status);
create index idx_notifications_created on notifications(created_at desc);

-- =============================================================================
-- 6. ROW LEVEL SECURITY
-- =============================================================================

alter table saved_searches enable row level security;
alter table workspace_summaries enable row level security;
alter table activity_feed enable row level security;
alter table notification_preferences enable row level security;
alter table notifications enable row level security;

-- Saved searches: users can only see their own
create policy "saved_searches_select" on saved_searches for select using (
  user_id = auth.uid()
);

create policy "saved_searches_insert" on saved_searches for insert with check (
  user_id = auth.uid()
);

create policy "saved_searches_delete" on saved_searches for delete using (
  user_id = auth.uid()
);

-- Workspace summaries: workspace members can view
create policy "workspace_summaries_select" on workspace_summaries for select using (
  get_workspace_role(workspace_id) is not null
);

create policy "workspace_summaries_insert" on workspace_summaries for insert with check (
  get_workspace_role(workspace_id) in ('owner', 'admin')
);

-- Activity feed: workspace members can view
create policy "activity_feed_select" on activity_feed for select using (
  get_workspace_role(workspace_id) is not null
);

create policy "activity_feed_insert" on activity_feed for insert with check (
  get_workspace_role(workspace_id) is not null
);

-- Notification preferences: users can manage their own
create policy "notif_prefs_select" on notification_preferences for select using (
  user_id = auth.uid()
);

create policy "notif_prefs_insert" on notification_preferences for insert with check (
  user_id = auth.uid()
);

create policy "notif_prefs_update" on notification_preferences for update using (
  user_id = auth.uid()
);

-- Notifications: users can only see their own
create policy "notifications_select" on notifications for select using (
  user_id = auth.uid()
);

create policy "notifications_update" on notifications for update using (
  user_id = auth.uid()
);

-- =============================================================================
-- 7. HELPER FUNCTIONS
-- =============================================================================

-- Record activity
create or replace function record_activity(
  p_workspace_id uuid,
  p_action text,
  p_target_type text,
  p_target_id uuid default null,
  p_target_title text default null,
  p_details jsonb default '{}'
)
returns uuid as $$
declare
  activity_id uuid;
begin
  insert into activity_feed (workspace_id, user_id, action, target_type, target_id, target_title, details)
  values (p_workspace_id, auth.uid(), p_action, p_target_type, p_target_id, p_target_title, p_details)
  returning id into activity_id;

  return activity_id;
end;
$$ language plpgsql security definer;

-- Get recent activity for workspace
create or replace function get_workspace_activity(
  p_workspace_id uuid,
  p_limit int default 50
)
returns table (
  id uuid,
  user_id uuid,
  action text,
  target_type text,
  target_id uuid,
  target_title text,
  details jsonb,
  created_at timestamptz,
  user_email text
) as $$
begin
  return query
  select
    a.id,
    a.user_id,
    a.action,
    a.target_type,
    a.target_id,
    a.target_title,
    a.details,
    a.created_at,
    u.email as user_email
  from activity_feed a
  left join auth.users u on u.id = a.user_id
  where a.workspace_id = p_workspace_id
    and get_workspace_role(p_workspace_id) is not null
  order by a.created_at desc
  limit p_limit;
end;
$$ language plpgsql security definer;

-- Create notification
create or replace function create_notification(
  p_user_id uuid,
  p_workspace_id uuid,
  p_title text,
  p_body text,
  p_notification_type text,
  p_link_type text default null,
  p_link_id uuid default null
)
returns uuid as $$
declare
  notif_id uuid;
begin
  insert into notifications (user_id, workspace_id, title, body, notification_type, link_type, link_id)
  values (p_user_id, p_workspace_id, p_title, p_body, p_notification_type, p_link_type, p_link_id)
  returning id into notif_id;

  return notif_id;
end;
$$ language plpgsql security definer;
