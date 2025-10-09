-- -----------------------------------------------------------------------------
-- migration name: 20251008120500_drop_rls_policies.sql
-- purpose       : temporarily remove row-level security (rls) policies during
--                 early MVP development & local workflows.
-- description   :
--   * drops all previously created policies on user-scoped tables
--   * does NOT disable rls itself (tables remain protected – queries will fail
--     unless run as service_role). adjust as needed.
--   * safe to re-run: uses if exists guards
-- -----------------------------------------------------------------------------

-- helper to drop policies for a given table & suffix list
create or replace function public.drop_policies(target_table text, suffixes text[]) returns void
language plpgsql as $$
declare
  suffix text;
begin
  foreach suffix in array suffixes loop
    execute format('drop policy if exists %I_%s on %I', target_table, suffix, target_table);
  end loop;
end;
$$;

-- list of tables with owner policies to drop
select public.drop_policies('decks',               array['owner_select','owner_insert','owner_update','owner_delete','service_role']);
select public.drop_policies('flashcards',          array['owner_select','owner_insert','owner_update','owner_delete','service_role']);
select public.drop_policies('ai_generations',      array['owner_select','owner_insert','owner_update','owner_delete','service_role']);
select public.drop_policies('generation_batches',  array['owner_select','owner_insert','owner_update','owner_delete','service_role']);
select public.drop_policies('reviews',             array['owner_select','owner_insert','owner_update','owner_delete','service_role']);
select public.drop_policies('events',              array['owner_select','owner_insert','owner_update','owner_delete','service_role']);

-- card_generations custom policies
select public.drop_policies('card_generations',    array['owner_select','service_role']);

-- background_jobs only had service policy
select public.drop_policies('background_jobs',     array['service_role']);

-- -----------------------------------------------------------------------------
-- end migration – all policies are now removed
-- -----------------------------------------------------------------------------
