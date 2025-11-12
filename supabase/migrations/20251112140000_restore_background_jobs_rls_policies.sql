-- -----------------------------------------------------------------------------
-- migration name: 20251112140000_restore_background_jobs_rls_policies.sql
-- purpose       : restore row-level security (rls) policies for background_jobs table
-- description   :
--   * background_jobs table is managed by the system, not users
--   * only service_role should have access to background_jobs
--   * drops existing policies first to avoid conflicts
-- -----------------------------------------------------------------------------

-- Drop existing background_jobs policies if they exist
drop policy if exists background_jobs_service_role on public.background_jobs;

-- Service role policy (background jobs are system-managed)
create policy background_jobs_service_role on public.background_jobs
  for all using (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- end migration
-- -----------------------------------------------------------------------------
