-- -----------------------------------------------------------------------------
-- migration name: 20251111150000_fix_events_rls_policies.sql
-- purpose       : fix events table RLS policies
-- description   :
--   * ensure RLS is enabled on events table
--   * create proper owner-based RLS policies for events table
--   * allows authenticated users to insert their own events
-- -----------------------------------------------------------------------------

-- Enable RLS on events table (in case it was disabled)
alter table public.events enable row level security;

-- Drop existing policies if they exist
drop policy if exists events_owner_select on public.events;
drop policy if exists events_owner_insert on public.events;
drop policy if exists events_owner_update on public.events;
drop policy if exists events_owner_delete on public.events;
drop policy if exists events_service_role on public.events;

-- Create owner-based policies for events table
create policy events_owner_select on public.events
  for select using (user_id = auth.uid());

create policy events_owner_insert on public.events
  for insert with check (user_id = auth.uid());

create policy events_owner_update on public.events
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy events_owner_delete on public.events
  for delete using (user_id = auth.uid());

-- Service role bypass
create policy events_service_role on public.events
  for all using (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- end migration
-- -----------------------------------------------------------------------------
