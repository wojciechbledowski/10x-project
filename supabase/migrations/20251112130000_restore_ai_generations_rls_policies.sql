-- -----------------------------------------------------------------------------
-- migration name: 20251112130000_restore_ai_generations_rls_policies.sql
-- purpose       : restore row-level security (rls) policies for ai_generations table
-- description   :
--   * add owner-based RLS policies for authenticated users on ai_generations table
--   * allows authenticated users to access their own AI generations
--   * drops existing policies first to avoid conflicts
-- -----------------------------------------------------------------------------

-- Drop existing ai_generations policies if they exist
drop policy if exists ai_generations_owner_select on public.ai_generations;
drop policy if exists ai_generations_owner_insert on public.ai_generations;
drop policy if exists ai_generations_owner_update on public.ai_generations;
drop policy if exists ai_generations_owner_delete on public.ai_generations;
drop policy if exists ai_generations_service_role on public.ai_generations;

-- Restore owner policies for ai_generations table
create policy ai_generations_owner_select on public.ai_generations
  for select using (user_id = auth.uid());

create policy ai_generations_owner_insert on public.ai_generations
  for insert with check (user_id = auth.uid());

create policy ai_generations_owner_update on public.ai_generations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy ai_generations_owner_delete on public.ai_generations
  for delete using (user_id = auth.uid());

-- Service role bypass
create policy ai_generations_service_role on public.ai_generations
  for all using (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- end migration
-- -----------------------------------------------------------------------------
