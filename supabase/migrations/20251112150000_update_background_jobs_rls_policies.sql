-- -----------------------------------------------------------------------------
-- migration name: 20251112150000_update_background_jobs_rls_policies.sql
-- purpose       : update row-level security (rls) policies for background_jobs table
-- description   :
--   * authenticated users can INSERT background jobs
--   * only service_role can SELECT/UPDATE/DELETE background jobs
--   * replaces the previous policy that was too restrictive
-- -----------------------------------------------------------------------------

-- Drop existing background_jobs policies if they exist
drop policy if exists background_jobs_service_role on public.background_jobs;
drop policy if exists background_jobs_insert on public.background_jobs;

-- Allow authenticated users to insert background jobs
create policy background_jobs_insert on public.background_jobs
  for insert with check (auth.role() = 'authenticated');

-- Service role policy for full access (system management)
create policy background_jobs_service_role on public.background_jobs
  for all using (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- end migration
-- -----------------------------------------------------------------------------
