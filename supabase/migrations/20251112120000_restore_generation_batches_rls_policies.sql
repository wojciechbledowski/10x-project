-- -----------------------------------------------------------------------------
-- migration name: 20251112120000_restore_generation_batches_rls_policies.sql
-- purpose       : restore row-level security (rls) policies for generation_batches table
-- description   :
--   * add owner-based RLS policies for authenticated users on generation_batches table
--   * allows authenticated users to access their own generation batches
--   * drops existing policies first to avoid conflicts
-- -----------------------------------------------------------------------------

-- Drop existing generation_batches policies if they exist
drop policy if exists generation_batches_owner_select on public.generation_batches;
drop policy if exists generation_batches_owner_insert on public.generation_batches;
drop policy if exists generation_batches_owner_update on public.generation_batches;
drop policy if exists generation_batches_owner_delete on public.generation_batches;
drop policy if exists generation_batches_service_role on public.generation_batches;

-- Restore owner policies for generation_batches table
create policy generation_batches_owner_select on public.generation_batches
  for select using (user_id = auth.uid());

create policy generation_batches_owner_insert on public.generation_batches
  for insert with check (user_id = auth.uid());

create policy generation_batches_owner_update on public.generation_batches
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy generation_batches_owner_delete on public.generation_batches
  for delete using (user_id = auth.uid());

-- Service role bypass
create policy generation_batches_service_role on public.generation_batches
  for all using (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- end migration
-- -----------------------------------------------------------------------------
