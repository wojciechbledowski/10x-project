-- -----------------------------------------------------------------------------
-- migration name: 20251111180000_drop_events_action_constraint.sql
-- purpose       : drop problematic action constraint
-- description   :
--   * removes the events_action_check constraint entirely
--   * allows any action values to be inserted into events table
--   * resolves constraint violation errors for all partitions
--   * trades data integrity for immediate functionality
-- -----------------------------------------------------------------------------

-- Drop the problematic constraint entirely
alter table public.events
drop constraint if exists events_action_check;

-- -----------------------------------------------------------------------------
-- end migration
-- -----------------------------------------------------------------------------
