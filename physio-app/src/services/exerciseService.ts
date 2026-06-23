import type { Exercise, ExerciseInput } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SAMPLE_EXERCISES } from '../data/exercises';

// ---------------------------------------------------------------------------
// Single access point for exercise data. If Supabase isn't configured (or a
// fetch fails), we transparently fall back to the bundled SAMPLE_EXERCISES so
// the app always works for demos and offline.
// ---------------------------------------------------------------------------

const TABLE = 'exercises';

// Runtime-imported exercises (from the Import screen). Kept in memory so the
// library / stats / plan generator reflect imports immediately, even offline.
// (Not persisted across app restarts unless Supabase is configured.)
let runtimeImported: Exercise[] = [];

let _autoId = 0;
function ensureId(input: ExerciseInput): Exercise {
  const id = input.id && input.id.trim() ? input.id.trim() : `imported-${Date.now()}-${_autoId++}`;
  return { ...(input as Omit<Exercise, 'id'>), id } as Exercise;
}

function mergeUnique(base: Exercise[], extra: Exercise[]): Exercise[] {
  const seen = new Set(base.map((e) => e.id));
  return [...base, ...extra.filter((e) => !seen.has(e.id))];
}

/** Add validated records to the in-memory store (used by the Import screen). */
export function addRuntimeExercises(inputs: ExerciseInput[]): number {
  const rows = inputs.map(ensureId);
  runtimeImported = mergeUnique(runtimeImported, rows);
  return rows.length;
}

export function getRuntimeImportedCount(): number {
  return runtimeImported.length;
}

export async function getAllExercises(): Promise<Exercise[]> {
  if (!isSupabaseConfigured || !supabase) return mergeUnique(SAMPLE_EXERCISES, runtimeImported);
  try {
    const { data, error } = await supabase.from(TABLE).select('*').order('title_pl');
    if (error) throw error;
    if (!data || data.length === 0) return mergeUnique(SAMPLE_EXERCISES, runtimeImported);
    return mergeUnique(data as Exercise[], runtimeImported);
  } catch (e) {
    console.warn('[exerciseService] falling back to local data:', e);
    return mergeUnique(SAMPLE_EXERCISES, runtimeImported);
  }
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  if (!isSupabaseConfigured || !supabase) {
    return SAMPLE_EXERCISES.find((e) => e.id === id) ?? null;
  }
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error) throw error;
    return (data as Exercise) ?? null;
  } catch (e) {
    console.warn('[exerciseService] getExerciseById fallback:', e);
    return SAMPLE_EXERCISES.find((e2) => e2.id === id) ?? null;
  }
}

// --- Admin write operations (require Supabase + auth) ----------------------

export async function upsertExercise(input: ExerciseInput): Promise<Exercise> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nie jest skonfigurowane — edycja niedostępna offline.');
  }
  const { data, error } = await supabase.from(TABLE).upsert(input).select().single();
  if (error) throw error;
  return data as Exercise;
}

export async function deleteExercise(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nie jest skonfigurowane — usuwanie niedostępne offline.');
  }
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

/** One-shot helper to push the bundled samples into an empty Supabase table. */
export async function seedSupabaseFromSamples(): Promise<number> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nie jest skonfigurowane.');
  }
  const rows = SAMPLE_EXERCISES.map(({ id, ...rest }) => rest); // let DB assign ids
  const { data, error } = await supabase.from(TABLE).insert(rows).select('id');
  if (error) throw error;
  return data?.length ?? 0;
}
