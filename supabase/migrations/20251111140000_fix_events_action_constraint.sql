-- -----------------------------------------------------------------------------
-- migration name: 20251111140000_fix_events_action_constraint.sql
-- purpose       : fix events table action constraint to include CREATE
-- description   :
--   * update events table action check constraint to include 'CREATE' action
--   * allows logging of flashcard creation events
--   * previously only allowed 'ACCEPT', 'EDIT', 'DELETE'
-- -----------------------------------------------------------------------------

-- Update events table action check constraint to include 'CREATE'
alter table public.events
drop constraint if exists events_action_check;

alter table public.events
add constraint events_action_check
check (action in ('ACCEPT', 'EDIT', 'DELETE', 'CREATE'));

-- -----------------------------------------------------------------------------
-- end migration
-- -----------------------------------------------------------------------------
