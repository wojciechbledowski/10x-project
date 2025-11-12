-- -----------------------------------------------------------------------------
-- migration name: 20251112210000_create_reviews_partitions.sql
-- purpose       : create partition tables for the reviews table (November 2025 - June 2026)
-- description   : ensure reviews table partitions exist for the current and upcoming months
-- -----------------------------------------------------------------------------

-- Create partition for November 2025 (current month in this context)
create table if not exists public.reviews_2025_11
  partition of public.reviews
  for values from ('2025-11-01') to ('2025-12-01');

-- Create partition for December 2025
create table if not exists public.reviews_2025_12
  partition of public.reviews
  for values from ('2025-12-01') to ('2026-01-01');

-- Create partition for January 2026
create table if not exists public.reviews_2026_01
  partition of public.reviews
  for values from ('2026-01-01') to ('2026-02-01');

-- Create partition for February 2026
create table if not exists public.reviews_2026_02
  partition of public.reviews
  for values from ('2026-02-01') to ('2026-03-01');

-- Create partition for March 2026
create table if not exists public.reviews_2026_03
  partition of public.reviews
  for values from ('2026-03-01') to ('2026-04-01');

-- Create partition for April 2026
create table if not exists public.reviews_2026_04
  partition of public.reviews
  for values from ('2026-04-01') to ('2026-05-01');

-- Create partition for May 2026
create table if not exists public.reviews_2026_05
  partition of public.reviews
  for values from ('2026-05-01') to ('2026-06-01');

-- Create partition for June 2026
create table if not exists public.reviews_2026_06
  partition of public.reviews
  for values from ('2026-06-01') to ('2026-07-01');
