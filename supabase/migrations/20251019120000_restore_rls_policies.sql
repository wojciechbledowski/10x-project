-- -----------------------------------------------------------------------------
-- migration name: 20251019120000_restore_rls_policies.sql
-- purpose       : restore row-level security (rls) policies for MVP development
-- description   :
--   * re-add owner-based RLS policies for authenticated users on decks table
--   * allows authenticated users to access their own decks
--   * drops existing policies first to avoid conflicts
-- -----------------------------------------------------------------------------

-- Drop existing policies if they exist
drop policy if exists decks_owner_select on public.decks;
drop policy if exists decks_owner_insert on public.decks;
drop policy if exists decks_owner_update on public.decks;
drop policy if exists decks_owner_delete on public.decks;
drop policy if exists decks_service_role on public.decks;

-- Restore owner policies for decks table
create policy decks_owner_select on public.decks
  for select using (user_id = auth.uid());

create policy decks_owner_insert on public.decks
  for insert with check (user_id = auth.uid());

create policy decks_owner_update on public.decks
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy decks_owner_delete on public.decks
  for delete using (user_id = auth.uid());

-- Service role bypass
create policy decks_service_role on public.decks
  for all using (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- end migration
-- -----------------------------------------------------------------------------
