-- -----------------------------------------------------------------------------
-- migration name: 20251111120000_add_events_partitions_future.sql
-- purpose       : add missing and future partitions for events table
-- description   :
--   * events table is partitioned by range on created_at (monthly)
--   * add partitions for November 2025 through June 2026 to prevent partition errors
--   * covers current month plus 6 months ahead for buffer
-- -----------------------------------------------------------------------------

-- Create future partitions for events table (monthly)
create table if not exists public.events_2025_11
  partition of public.events
  for values from ('2025-11-01') to ('2025-12-01');

create table if not exists public.events_2025_12
  partition of public.events
  for values from ('2025-12-01') to ('2026-01-01');

create table if not exists public.events_2026_01
  partition of public.events
  for values from ('2026-01-01') to ('2026-02-01');

create table if not exists public.events_2026_02
  partition of public.events
  for values from ('2026-02-01') to ('2026-03-01');

create table if not exists public.events_2026_03
  partition of public.events
  for values from ('2026-03-01') to ('2026-04-01');

create table if not exists public.events_2026_04
  partition of public.events
  for values from ('2026-04-01') to ('2026-05-01');

create table if not exists public.events_2026_05
  partition of public.events
  for values from ('2026-05-01') to ('2026-06-01');

create table if not exists public.events_2026_06
  partition of public.events
  for values from ('2026-06-01') to ('2026-07-01');

-- -----------------------------------------------------------------------------
-- end migration
-- -----------------------------------------------------------------------------
