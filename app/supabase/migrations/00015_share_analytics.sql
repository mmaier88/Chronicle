-- Share link analytics tracking
-- Tracks views and listens on shared links for growth insights

create table if not exists share_analytics (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references book_shares(id) on delete cascade,
  event_type text not null check (event_type in ('view', 'listen', 'read')),
  user_agent text,
  referrer text,
  created_at timestamptz default now()
);

-- Index for querying analytics by share
create index if not exists idx_share_analytics_share_id on share_analytics(share_id);
create index if not exists idx_share_analytics_created_at on share_analytics(created_at);

-- RLS: Allow inserts from service role only (analytics are server-side)
alter table share_analytics enable row level security;

-- Service role can do everything
create policy "Service role full access on share_analytics" on share_analytics
  for all using (auth.role() = 'service_role');

-- Add view count to book_shares for quick access
alter table book_shares add column if not exists view_count int default 0;
alter table book_shares add column if not exists listen_count int default 0;

-- Function to increment view count
create or replace function increment_share_view_count()
returns trigger as $$
begin
  if NEW.event_type = 'view' then
    update book_shares set view_count = view_count + 1 where id = NEW.share_id;
  elsif NEW.event_type = 'listen' then
    update book_shares set listen_count = listen_count + 1 where id = NEW.share_id;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger to auto-increment counts
drop trigger if exists share_analytics_count_trigger on share_analytics;
create trigger share_analytics_count_trigger
  after insert on share_analytics
  for each row execute function increment_share_view_count();
