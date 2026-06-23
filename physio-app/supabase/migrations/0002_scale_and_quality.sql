-- ===========================================================================
-- Migration 0002 — scale to 10k–100k+ records, fuzzy search, quality scoring.
-- Safe & additive: no destructive DDL. Run after schema.sql.
-- ===========================================================================

-- Trigram fuzzy search (typo / inflection tolerant) on titles + descriptions.
create extension if not exists pg_trgm;

create index if not exists idx_exercises_title_pl_trgm
  on public.exercises using gin (title_pl gin_trgm_ops);
create index if not exists idx_exercises_title_en_trgm
  on public.exercises using gin (title_en gin_trgm_ops);
create index if not exists idx_exercises_desc_pl_trgm
  on public.exercises using gin (description_pl gin_trgm_ops);

-- Array containment for the remaining tag dimensions used by the repository.
create index if not exists idx_exercises_tissue    on public.exercises using gin (tissue_tags);
create index if not exists idx_exercises_equipment on public.exercises using gin (equipment);

-- Composite index for the most common paginated filter (region + difficulty,
-- ordered by title for stable keyset/range pagination at scale).
create index if not exists idx_exercises_region_diff_title
  on public.exercises (body_region, difficulty_level, title_pl);

-- ---------------------------------------------------------------------------
-- Quality scoring columns (mirrors src/engine/quality.ts). Optional but lets
-- the catalogue be filtered/sorted by quality server-side at scale.
-- ---------------------------------------------------------------------------
alter table public.exercises add column if not exists quality_score numeric(4,3);
alter table public.exercises add column if not exists quality_status text
  check (quality_status in ('excellent','good','needs_review'));

comment on column public.exercises.quality_score is
  '0..1 score: completeness*0.4 + translation*0.2 + tagConfidence*0.25 + media*0.15';

create index if not exists idx_exercises_quality on public.exercises (quality_status);

-- ---------------------------------------------------------------------------
-- Server-side fuzzy search RPC. The app calls this when Supabase is configured
-- so the device never downloads the full table. similarity() is index-backed.
-- ---------------------------------------------------------------------------
create or replace function public.search_exercises(
  q text,
  region text default null,
  max_difficulty int default null,
  lim int default 20,
  off int default 0
)
returns setof public.exercises
language sql stable as $$
  select *
  from public.exercises e
  where (region is null or e.body_region = region)
    and (max_difficulty is null or e.difficulty_level <= max_difficulty)
    and (
      q is null or q = '' or
      e.title_pl % q or e.title_en % q or e.description_pl % q
      or e.title_pl ilike '%' || q || '%'
    )
  order by greatest(
    similarity(e.title_pl, coalesce(q,'')),
    similarity(coalesce(e.title_en,''), coalesce(q,''))
  ) desc, e.title_pl
  limit lim offset off;
$$;

-- Lower the trigram match threshold a little for short clinical terms.
-- (Run once per session or set in the DB settings.)
-- select set_limit(0.2);
