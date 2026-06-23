-- ===========================================================================
-- Physio app — Supabase / Postgres schema
-- Run in Supabase SQL editor (or via the CLI) before seeding.
-- ===========================================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

create table if not exists public.exercises (
  id                 uuid primary key default gen_random_uuid(),
  title_pl           text not null,
  title_en           text,
  description_pl     text not null,
  description_en     text,
  body_region        text not null,
  condition_tags     text[] not null default '{}',
  tissue_tags        text[] not null default '{}',
  goal_tags          text[] not null default '{}',
  difficulty_level   int  not null default 1 check (difficulty_level between 1 and 3),
  equipment          text[] not null default '{}',
  position           text,
  contraindications  text[] not null default '{}',
  red_flags          text[] not null default '{}',
  sets               int,
  reps               int,
  duration_seconds   int,
  frequency_per_week int,
  progression        text,
  regression         text,
  image_url          text,
  video_url          text,
  source_url         text,
  license_note       text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Helpful indexes for the matching engine (array containment / overlap).
create index if not exists idx_exercises_body_region on public.exercises (body_region);
create index if not exists idx_exercises_difficulty  on public.exercises (difficulty_level);
create index if not exists idx_exercises_condition    on public.exercises using gin (condition_tags);
create index if not exists idx_exercises_goal         on public.exercises using gin (goal_tags);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_exercises_updated_at on public.exercises;
create trigger trg_exercises_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- Row Level Security
--   * Anyone (anon) may READ exercises (public catalogue).
--   * Only authenticated users may write (admin panel logs in).
--   Tighten the write policy to an admins table/role before production.
-- ===========================================================================
alter table public.exercises enable row level security;

drop policy if exists "exercises_read_all" on public.exercises;
create policy "exercises_read_all"
  on public.exercises for select
  using (true);

drop policy if exists "exercises_write_authenticated" on public.exercises;
create policy "exercises_write_authenticated"
  on public.exercises for all
  to authenticated
  using (true)
  with check (true);
