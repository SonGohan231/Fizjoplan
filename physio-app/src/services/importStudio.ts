import type { ExerciseInput } from '../types';
import { parseContent, ImportError, ImportParseResult } from './importService';
import { enrichWithTags } from '../engine/autoTagger';
import { translateBatch, ExerciseTranslationSource } from '../engine/translation';
import { computeQuality, QualityStatus } from '../engine/quality';
import { normalize } from '../engine/analyzer';
import { trigramSimilarity } from '../engine/search';

// ---------------------------------------------------------------------------
// Import Studio: end-to-end ingestion pipeline.
//   parse -> validate -> detect duplicates -> flag suspicious -> report
// plus batch operations (tag / translate / edit / tag-add) and a merge step.
// Pure logic; the screen renders the report and triggers the batch actions.
// ---------------------------------------------------------------------------

export interface SuspiciousFlag { index: number; title?: string; reasons: string[] }
export interface DuplicateGroup {
  key: string;
  indices: number[]; // indices into the valid[] array
  similarity: number; // 1 = exact title+region, <1 = near-duplicate
}

export interface ValidationReport {
  totalRows: number;
  valid: ExerciseInput[];
  invalid: ImportError[];
  duplicates: DuplicateGroup[];
  suspicious: SuspiciousFlag[];
  qualityCounts: Record<QualityStatus, number>;
}

/** Parse a single pasted blob (JSON or CSV). */
export function parseSingle(text: string, format: 'json' | 'csv'): ImportParseResult {
  return parseContent(text, format);
}

// --- Duplicate detection ---------------------------------------------------

function dupKey(rec: ExerciseInput): string {
  return `${normalize(rec.title_pl)}::${rec.body_region}`;
}

export function detectDuplicates(records: ExerciseInput[], nearThreshold = 0.82): DuplicateGroup[] {
  const groups = new Map<string, number[]>();
  records.forEach((r, i) => {
    const k = dupKey(r);
    groups.set(k, [...(groups.get(k) ?? []), i]);
  });

  const result: DuplicateGroup[] = [];
  for (const [key, indices] of groups) if (indices.length > 1) result.push({ key, indices, similarity: 1 });

  // Near-duplicates: same region, highly similar titles (different wording).
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      if (records[i].body_region !== records[j].body_region) continue;
      if (dupKey(records[i]) === dupKey(records[j])) continue; // already exact
      const sim = trigramSimilarity(normalize(records[i].title_pl), normalize(records[j].title_pl));
      if (sim >= nearThreshold) {
        result.push({ key: `near:${i}-${j}`, indices: [i, j], similarity: Number(sim.toFixed(2)) });
      }
    }
  }
  return result;
}

/** Merge a group of duplicate records into one: union tags, prefer filled fields. */
export function mergeRecords(records: ExerciseInput[]): ExerciseInput {
  const base: ExerciseInput = { ...records[0] };
  const arrUnion = (key: keyof ExerciseInput) => {
    const set = new Set<string>();
    for (const r of records) (r[key] as string[] | undefined)?.forEach((v) => set.add(v));
    return [...set];
  };
  base.condition_tags = arrUnion('condition_tags');
  base.tissue_tags = arrUnion('tissue_tags');
  base.goal_tags = arrUnion('goal_tags');
  base.equipment = arrUnion('equipment');
  base.contraindications = arrUnion('contraindications');
  base.red_flags = arrUnion('red_flags');

  const scalarKeys: (keyof ExerciseInput)[] = [
    'title_en', 'description_en', 'position', 'sets', 'reps', 'duration_seconds',
    'frequency_per_week', 'progression', 'regression', 'image_url', 'video_url', 'source_url', 'license_note',
  ];
  for (const k of scalarKeys) {
    if (base[k] === null || base[k] === undefined || base[k] === '') {
      const filled = records.find((r) => r[k] !== null && r[k] !== undefined && r[k] !== '');
      if (filled) (base as any)[k] = filled[k];
    }
  }
  return base;
}

// --- Suspicious record detection -------------------------------------------

export function flagSuspicious(records: ExerciseInput[]): SuspiciousFlag[] {
  const flags: SuspiciousFlag[] = [];
  records.forEach((rec, index) => {
    const reasons: string[] = [];
    if (rec.description_pl.trim().length < 25) reasons.push('Bardzo krótki opis (możliwe niekompletne instrukcje).');
    const q = computeQuality(rec);
    if (q.status === 'needs_review') reasons.push(`Niska jakość (${Math.round(q.score * 100)}%): ${q.missing.slice(0, 4).join(', ')}.`);
    const { suggestions } = enrichWithTags({ ...rec });
    if (suggestions.body_region && suggestions.body_region.value !== rec.body_region && suggestions.body_region.confidence >= 0.7) {
      reasons.push(`Region „${rec.body_region}” może nie pasować do treści (sugerowany: ${suggestions.body_region.value}).`);
    }
    if (!rec.progression && !rec.regression) reasons.push('Brak progresji i regresji.');
    if (reasons.length) flags.push({ index, title: rec.title_pl, reasons });
  });
  return flags;
}

// --- Full report -----------------------------------------------------------

export function buildReport(parsed: ImportParseResult): ValidationReport {
  const qualityCounts: Record<QualityStatus, number> = { excellent: 0, good: 0, needs_review: 0 };
  for (const r of parsed.valid) qualityCounts[computeQuality(r).status] += 1;
  return {
    totalRows: parsed.totalRows,
    valid: parsed.valid,
    invalid: parsed.errors.filter((e) => e.row > 0 || e.messages.length > 0),
    duplicates: detectDuplicates(parsed.valid),
    suspicious: flagSuspicious(parsed.valid),
    qualityCounts,
  };
}

// --- Batch operations ------------------------------------------------------

export function batchAutoTag(records: ExerciseInput[], minConfidence = 0.55): ExerciseInput[] {
  return records.map((r) => enrichWithTags(r, { minConfidence }).record);
}

export function batchTranslate(records: (ExerciseInput & ExerciseTranslationSource)[]): { records: ExerciseInput[]; meanQuality: number; needsReview: number } {
  return translateBatch(records);
}

export function batchAddTag(records: ExerciseInput[], field: 'condition_tags' | 'goal_tags' | 'equipment', tag: string): ExerciseInput[] {
  return records.map((r) => {
    const cur = (r[field] as string[]) ?? [];
    return cur.includes(tag) ? r : { ...r, [field]: [...cur, tag] };
  });
}

export function batchEdit(records: ExerciseInput[], patch: Partial<ExerciseInput>): ExerciseInput[] {
  return records.map((r) => ({ ...r, ...patch }));
}

/** Apply duplicate merges, returning a de-duplicated record list. */
export function applyMerges(records: ExerciseInput[], groups: DuplicateGroup[]): ExerciseInput[] {
  const removed = new Set<number>();
  const merged: ExerciseInput[] = [];
  for (const g of groups) {
    const recs = g.indices.map((i) => records[i]);
    merged.push(mergeRecords(recs));
    g.indices.forEach((i) => removed.add(i));
  }
  const survivors = records.filter((_, i) => !removed.has(i));
  return [...survivors, ...merged];
}
