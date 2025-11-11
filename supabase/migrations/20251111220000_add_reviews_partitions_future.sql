-- -----------------------------------------------------------------------------
-- migration name: 20251111220000_add_reviews_partitions_future.sql
-- purpose       : add missing and future partitions for reviews table
-- description   :
--   * reviews table is partitioned by range on created_at (monthly)
--   * add partitions for November 2025 through June 2026 to prevent partition errors
--   * covers current month plus 6 months ahead for buffer
-- -----------------------------------------------------------------------------

-- Create future partitions for reviews table (monthly)
create table if not exists public.reviews_2025_11
  partition of public.reviews
  for values from ('2025-11-01') to ('2025-12-01');

create table if not exists public.reviews_2025_12
  partition of public.reviews
  for values from ('2025-12-01') to ('2026-01-01');

create table if not exists public.reviews_2026_01
  partition of public.reviews
  for values from ('2026-01-01') to ('2026-02-01');

create table if not exists public.reviews_2026_02
  partition of public.reviews
  for values from ('2026-02-01') to ('2026-03-01');

create table if not exists public.reviews_2026_03
  partition of public.reviews
  for values from ('2026-03-01') to ('2026-04-01');

create table if not exists public.reviews_2026_04
  partition of public.reviews
  for values from ('2026-04-01') to ('2026-05-01');

create table if not exists public.reviews_2026_05
  partition of public.reviews
  for values from ('2026-05-01') to ('2026-06-01');

create table if not exists public.reviews_2026_06
  partition of public.reviews
  for values from ('2026-06-01') to ('2026-07-01');

-- -----------------------------------------------------------------------------
-- end migration
-- -----------------------------------------------------------------------------
