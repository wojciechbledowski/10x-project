-- -----------------------------------------------------------------------------
-- migration name: 20251112170000_disable_background_jobs_rls.sql
-- purpose       : disable row-level security for background_jobs table
-- description   :
--   * background_jobs are system-managed and not user-accessible
--   * API only needs to create jobs, system processes them
--   * disable RLS to avoid authentication issues
-- -----------------------------------------------------------------------------

-- Disable RLS for background_jobs table
alter table public.background_jobs disable row level security;

-- -----------------------------------------------------------------------------
-- end migration
-- -----------------------------------------------------------------------------
