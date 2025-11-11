-- -----------------------------------------------------------------------------
-- migration name: 20251111160000_update_partition_constraints.sql
-- purpose       : update constraints on existing events partitions
-- description   :
--   * detach and reattach partitions to inherit updated parent constraints
--   * fixes constraint violations for October and November 2025 events
-- -----------------------------------------------------------------------------

-- Detach the October 2025 partition to modify its constraint
alter table public.events detach partition public.events_2025_10;

-- Drop the inherited constraint from the detached partition
alter table public.events_2025_10
drop constraint events_action_check;

-- Add the updated constraint to the detached partition
alter table public.events_2025_10
add constraint events_action_check
check (action in ('ACCEPT', 'EDIT', 'DELETE', 'CREATE'));

-- Reattach the partition to the parent table
alter table public.events attach partition public.events_2025_10
for values from ('2025-10-01') to ('2025-11-01');

-- Detach the November 2025 partition to modify its constraint
alter table public.events detach partition public.events_2025_11;

-- Drop the inherited constraint from the detached partition
alter table public.events_2025_11
drop constraint events_action_check;

-- Add the updated constraint to the detached partition
alter table public.events_2025_11
add constraint events_action_check
check (action in ('ACCEPT', 'EDIT', 'DELETE', 'CREATE'));

-- Reattach the partition to the parent table
alter table public.events attach partition public.events_2025_11
for values from ('2025-11-01') to ('2025-12-01');

-- -----------------------------------------------------------------------------
-- end migration
-- -----------------------------------------------------------------------------
