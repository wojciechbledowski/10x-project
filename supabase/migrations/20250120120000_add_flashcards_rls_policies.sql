-- -----------------------------------------------------------------------------
-- migration name: 20251111130000_add_flashcards_rls_policies.sql
-- purpose       : add row-level security (rls) policies for flashcards table
-- description   :
--   * add owner-based RLS policies for authenticated users on flashcards table
--   * allows authenticated users to access their own flashcards
--   * drops existing policies first to avoid conflicts
-- -----------------------------------------------------------------------------

-- Drop existing policies if they exist
drop policy if exists flashcards_owner_select on public.flashcards;
drop policy if exists flashcards_owner_insert on public.flashcards;
drop policy if exists flashcards_owner_update on public.flashcards;
drop policy if exists flashcards_owner_delete on public.flashcards;
drop policy if exists flashcards_service_role on public.flashcards;

-- Restore owner policies for flashcards table
create policy flashcards_owner_select on public.flashcards
  for select using (user_id = auth.uid());

create policy flashcards_owner_insert on public.flashcards
  for insert with check (user_id = auth.uid());

create policy flashcards_owner_update on public.flashcards
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy flashcards_owner_delete on public.flashcards
  for delete using (user_id = auth.uid());

-- Service role bypass
create policy flashcards_service_role on public.flashcards
  for all using (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- end migration
-- -----------------------------------------------------------------------------
