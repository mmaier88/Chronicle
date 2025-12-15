-- =============================================================================
-- Fix: Allow workspace owners to add themselves as the first member
-- =============================================================================
--
-- The existing policy "Owners and admins can manage members" requires the user
-- to already be a member with owner/admin role to insert members. This creates
-- a chicken-and-egg problem when creating a new workspace - the owner can't
-- add themselves as the first member.
--
-- This migration adds a policy that allows workspace owners to insert themselves.
-- =============================================================================

-- Drop policy if it already exists (idempotent)
drop policy if exists "Workspace owner can add self as first member" on workspace_members;

-- Allow workspace owner to insert themselves as first member
create policy "Workspace owner can add self as first member"
  on workspace_members for insert
  with check (
    -- User can only insert themselves
    user_id = auth.uid()
    -- And must be the workspace owner
    and exists (
      select 1 from workspaces
      where id = workspace_id
      and owner_id = auth.uid()
    )
  );
