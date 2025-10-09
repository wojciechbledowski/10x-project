-- -----------------------------------------------------------------------------
-- migration name: 20251008120000_create_core_schema.sql
-- purpose       : initial schema for AI Flashcard Generator MVP
-- description   :
--   * create extension pgcrypto for uuid generation
--   * define custom enum types
--   * create core tables: decks, flashcards, ai_generations, generation_batches,
--     card_generations, reviews (partitioned), events (partitioned), background_jobs
--   * create materialized view metrics_daily (empty, refreshed later)
--   * add constraints, indexes, check constraints
--   * enable row level security (rls) on user-scoped tables
--   * add granular rls policies for "authenticated" users (owner-based) and
--     service_role bypass
-- special notes :
--   * time-series tables (reviews, events) are defined as partitioned by range
--     on created_at; monthly partitions must be created in follow-up migrations
--   * destructive actions: none (new schema)
-- -----------------------------------------------------------------------------

-- ensure required extension for uuid generation
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. enum types
-- -----------------------------------------------------------------------------

create type source_enum as enum ('ai', 'manual', 'ai_edited');

-- status enums could be promoted later; using text for flexibility

-- -----------------------------------------------------------------------------
-- 2. tables
-- -----------------------------------------------------------------------------

-- 2.1 decks
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 2.2 flashcards
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete set null,
  front text not null check (length(front) <= 1000),
  back  text not null check (length(back)  <= 1000),
  source source_enum not null default 'manual',
  ease_factor numeric(4,2) not null default 2.50 check (ease_factor >= 1.30),
  interval_days integer not null default 0 check (interval_days >= 0),
  repetition integer not null default 0 check (repetition >= 0),
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- trigger to maintain updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger flashcards_set_updated_at
before update on public.flashcards
for each row execute function public.set_updated_at();

-- 2.3 generation_batches
create table public.generation_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2.4 ai_generations
create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete set null,
  generation_batch_id uuid references public.generation_batches(id) on delete set null,
  status text not null check (status in ('PENDING','SUCCESS','ERROR')),
  model_name text not null,
  model_version text,
  temperature numeric(3,2),
  top_p numeric(3,2),
  prompt_tokens integer,
  completion_tokens integer,
  config jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

-- 2.5 card_generations (junction)
create table public.card_generations (
  flashcard_id uuid not null references public.flashcards(id) on delete cascade,
  generation_id uuid not null references public.ai_generations(id) on delete cascade,
  primary key (flashcard_id, generation_id)
);

-- 2.6 reviews (partitioned by range)
create table public.reviews (
  id uuid default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flashcard_id uuid not null references public.flashcards(id) on delete cascade,
  quality smallint not null check (quality between 0 and 5),
  latency_ms integer,
  created_at timestamptz not null default now(),
  primary key (id, created_at) -- composite key required for partitioned tables
) partition by range (created_at);

-- 2.7 events (audit – partitioned)
create table public.events (
  id bigserial,
  user_id uuid not null,
  flashcard_id uuid not null,
  action text not null check (action in ('ACCEPT','EDIT','DELETE')),
  source source_enum not null,
  created_at timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);

alter table public.events
  add foreign key (user_id) references auth.users(id) on delete cascade,
  add foreign key (flashcard_id) references public.flashcards(id) on delete cascade;

-- 2.8 background_jobs
create table public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  payload jsonb not null,
  status text not null check (status in ('QUEUED','RUNNING','SUCCESS','ERROR')),
  retry_count smallint not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger background_jobs_set_updated_at
before update on public.background_jobs
for each row execute function public.set_updated_at();

-- 2.9 materialized view placeholder
create materialized view public.metrics_daily as
select
  now()::date as metric_date,
  null::uuid as user_id,
  0 as cards_generated,
  0 as cards_accepted,
  0.0::numeric(5,2) as acceptance_rate,
  0.0::numeric(5,2) as ai_usage_rate
where false; -- empty view to be refreshed nightly

-- -----------------------------------------------------------------------------
-- 3. indexes
-- -----------------------------------------------------------------------------

create index if not exists flashcards_user_next_idx
  on public.flashcards (user_id, next_review_at)
  where next_review_at is not null;

create index if not exists flashcards_search_idx
  on public.flashcards using gin (to_tsvector('simple', front || ' ' || back));

create index if not exists ai_generations_user_created_idx
  on public.ai_generations (user_id, created_at desc);

create index if not exists reviews_flashcard_created_idx
  on public.reviews (flashcard_id, created_at desc);

create index if not exists events_flashcard_created_idx
  on public.events (flashcard_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 4. row-level security (rls)
-- -----------------------------------------------------------------------------

-- helper function to quickly apply owner & service role policies
create or replace function public.apply_owner_rls(target_table text) returns void
language plpgsql as $$
begin
  execute format('alter table %I enable row level security', target_table);

  -- owner policies for authenticated users
  execute format('create policy %I_owner_select on %I for select using (user_id = auth.uid())', target_table, target_table);
  execute format('create policy %I_owner_insert on %I for insert with check (user_id = auth.uid())', target_table, target_table);
  execute format('create policy %I_owner_update on %I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', target_table, target_table);
  execute format('create policy %I_owner_delete on %I for delete using (user_id = auth.uid())', target_table, target_table);

  -- service role bypass
  execute format('create policy %I_service_role on %I for all using (auth.role() = ''service_role'')', target_table, target_table);
end;
$$;

-- apply to user-scoped tables
select public.apply_owner_rls('decks');
select public.apply_owner_rls('flashcards');
select public.apply_owner_rls('ai_generations');
select public.apply_owner_rls('generation_batches');
select public.apply_owner_rls('reviews');
select public.apply_owner_rls('events');
-- background_jobs are system-managed; no direct user access

alter table public.background_jobs enable row level security;

create policy background_jobs_service_role on public.background_jobs
  for all using (auth.role() = 'service_role');

-- card_generations is derived; restrict via referenced tables
alter table public.card_generations enable row level security;

-- policy: allow select if user owns either side; insert/update/delete handled via triggers and fk
create policy card_generations_owner_select on public.card_generations
  for select using (
    exists (
      select 1 from public.flashcards f where f.id = flashcard_id and f.user_id = auth.uid()
    )
  );

create policy card_generations_service_role on public.card_generations
  for all using (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- 5. partitioning helpers (optional initial partitions)
-- -----------------------------------------------------------------------------
-- create current month partitions to ensure immediate insert performance
-- additional partitions should be created via scheduled jobs or migrations

-- example for reviews current month partition
create table if not exists public.reviews_2025_10
  partition of public.reviews
  for values from ('2025-10-01') to ('2025-11-01');

-- example for events current month partition
create table if not exists public.events_2025_10
  partition of public.events
  for values from ('2025-10-01') to ('2025-11-01');

-- -----------------------------------------------------------------------------
-- end of migration
-- -----------------------------------------------------------------------------
