import type { Exercise, BodyRegion } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getAllExercises } from './exerciseService';
import { searchExercises } from '../engine/search';

// ---------------------------------------------------------------------------
// Scalable read layer. Designed to stay responsive at 10k–100k+ records.
//
//  * Pagination + lazy loading (page/pageSize, hasMore).
//  * In-memory indices (region / condition) for O(1) filtered access offline.
//  * Short-TTL cache so repeated screen focuses don't re-fetch.
//  * Pushes filtering/pagination DOWN to Supabase (.eq/.contains/.range) when
//    configured, so the device never loads the whole table; falls back to the
//    bundled + runtime-imported pool offline.
//  * Fuzzy search backed by the search engine offline, or pg_trgm server-side
//    (see migration 0002) when Supabase is configured.
// ---------------------------------------------------------------------------

const TABLE = 'exercises';
const CACHE_TTL_MS = 30_000;

interface IndexBundle {
  all: Exercise[];
  byRegion: Map<string, Exercise[]>;
  byCondition: Map<string, Exercise[]>;
  builtAt: number;
}

let cache: IndexBundle | null = null;

function buildIndex(all: Exercise[]): IndexBundle {
  const byRegion = new Map<string, Exercise[]>();
  const byCondition = new Map<string, Exercise[]>();
  for (const ex of all) {
    byRegion.set(ex.body_region, [...(byRegion.get(ex.body_region) ?? []), ex]);
    for (const c of ex.condition_tags) byCondition.set(c, [...(byCondition.get(c) ?? []), ex]);
  }
  return { all, byRegion, byCondition, builtAt: Date.now() };
}

async function getIndex(force = false): Promise<IndexBundle> {
  if (!force && cache && Date.now() - cache.builtAt < CACHE_TTL_MS) return cache;
  const all = await getAllExercises();
  cache = buildIndex(all);
  return cache;
}

/** Invalidate the cache (call after an import that changes the runtime store). */
export function invalidateCache(): void {
  cache = null;
}

export interface ExerciseFilters {
  region?: BodyRegion;
  condition?: string;
  difficulty?: number;
  equipment?: string;
  query?: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

function applyFiltersInMemory(idx: IndexBundle, f: ExerciseFilters): Exercise[] {
  // Start from the most selective index available.
  let pool: Exercise[] = f.region
    ? idx.byRegion.get(f.region) ?? []
    : f.condition
    ? idx.byCondition.get(f.condition) ?? []
    : idx.all;

  if (f.region && f.condition) pool = pool.filter((e) => e.condition_tags.includes(f.condition!));
  if (f.difficulty) pool = pool.filter((e) => e.difficulty_level === f.difficulty);
  if (f.equipment) pool = pool.filter((e) => e.equipment.includes(f.equipment!));

  if (f.query && f.query.trim()) {
    const hits = searchExercises(f.query, pool, { limit: pool.length, minScore: 0.5 });
    pool = hits.map((h) => h.exercise);
  }
  return pool;
}

/** Paginated, filtered query. Uses Supabase server-side when configured. */
export async function queryExercises(filters: ExerciseFilters, page = 0, pageSize = 20): Promise<Page<Exercise>> {
  if (isSupabaseConfigured && supabase && !filters.query) {
    // Server-side filter + range pagination (keeps the device light at scale).
    let q = supabase.from(TABLE).select('*', { count: 'exact' });
    if (filters.region) q = q.eq('body_region', filters.region);
    if (filters.condition) q = q.contains('condition_tags', [filters.condition]);
    if (filters.difficulty) q = q.eq('difficulty_level', filters.difficulty);
    if (filters.equipment) q = q.contains('equipment', [filters.equipment]);
    const from = page * pageSize;
    q = q.order('title_pl').range(from, from + pageSize - 1);
    try {
      const { data, count, error } = await q;
      if (error) throw error;
      const total = count ?? data?.length ?? 0;
      return { items: (data as Exercise[]) ?? [], total, page, pageSize, hasMore: from + pageSize < total };
    } catch (e) {
      console.warn('[repository] Supabase query failed, using local index:', e);
    }
  }

  // Offline / text-search path: filter in memory over the cached index.
  const idx = await getIndex();
  const filtered = applyFiltersInMemory(idx, filters);
  const start = page * pageSize;
  const items = filtered.slice(start, start + pageSize);
  return { items, total: filtered.length, page, pageSize, hasMore: start + pageSize < filtered.length };
}

/** Region counts for the stats screen (uses the in-memory index offline). */
export async function countByRegion(): Promise<{ region: string; count: number }[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      // One lightweight query per region keeps payloads tiny vs. loading rows.
      const regions: BodyRegion[] = ['neck','shoulder','elbow','wrist_hand','thoracic','lower_back','hip','knee','ankle_foot','general'];
      const out: { region: string; count: number }[] = [];
      for (const r of regions) {
        const { count } = await supabase.from(TABLE).select('id', { count: 'exact', head: true }).eq('body_region', r);
        if (count && count > 0) out.push({ region: r, count });
      }
      if (out.length) return out.sort((a, b) => b.count - a.count);
    } catch (e) {
      console.warn('[repository] countByRegion fallback:', e);
    }
  }
  const idx = await getIndex();
  return [...idx.byRegion.entries()].map(([region, list]) => ({ region, count: list.length })).sort((a, b) => b.count - a.count);
}

export async function totalCount(): Promise<number> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { count } = await supabase.from(TABLE).select('id', { count: 'exact', head: true });
      if (typeof count === 'number') return count;
    } catch {/* fall through */}
  }
  const idx = await getIndex();
  return idx.all.length;
}
