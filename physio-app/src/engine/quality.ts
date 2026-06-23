import type { Exercise, ExerciseInput } from '../types';
import { autoTag } from './autoTagger';

// ---------------------------------------------------------------------------
// Exercise quality scoring. Combines completeness, translation quality, tag
// confidence, and media availability into a 0..1 score + a human status label.
// Used by the import studio and library to flag records needing review.
// ---------------------------------------------------------------------------

export type QualityStatus = 'excellent' | 'good' | 'needs_review';

export interface QualityBreakdown {
  completeness: number; // 0..1
  translation: number; // 0..1
  tagConfidence: number; // 0..1
  media: number; // 0..1
  score: number; // weighted 0..1
  status: QualityStatus;
  missing: string[];
}

const COMPLETENESS_FIELDS: (keyof Exercise)[] = [
  'title_pl', 'description_pl', 'body_region', 'condition_tags', 'goal_tags',
  'tissue_tags', 'difficulty_level', 'equipment', 'position', 'sets',
  'frequency_per_week', 'progression', 'regression',
];

const WEIGHTS = { completeness: 0.4, translation: 0.2, tagConfidence: 0.25, media: 0.15 };

function isFilled(v: any): boolean {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'number') return !Number.isNaN(v);
  return true;
}

export interface QualityInput {
  translationQuality?: number; // if known (0..1)
}

export function computeQuality(ex: ExerciseInput, opts: QualityInput = {}): QualityBreakdown {
  const missing: string[] = [];
  let filled = 0;
  for (const f of COMPLETENESS_FIELDS) {
    if (isFilled((ex as any)[f])) filled += 1;
    else missing.push(String(f));
  }
  const completeness = filled / COMPLETENESS_FIELDS.length;

  // Translation: provided, else assume curated PL content is fine when present.
  const translation =
    typeof opts.translationQuality === 'number'
      ? opts.translationQuality
      : isFilled(ex.title_pl) && isFilled(ex.description_pl) ? 0.9 : 0.4;

  // Tag confidence: how well the (current) tags align with auto-inferred ones.
  const sugg = autoTag(ex);
  const tagConfidence = Math.max(
    sugg.overallConfidence,
    sugg.body_region && ex.body_region === sugg.body_region.value ? sugg.body_region.confidence : 0,
  );

  const media = isFilled(ex.image_url) || isFilled(ex.video_url) ? 1 : 0;

  const score =
    WEIGHTS.completeness * completeness +
    WEIGHTS.translation * translation +
    WEIGHTS.tagConfidence * tagConfidence +
    WEIGHTS.media * media;

  return {
    completeness: round(completeness),
    translation: round(translation),
    tagConfidence: round(tagConfidence),
    media,
    score: round(score),
    status: statusFor(score),
    missing,
  };
}

export function statusFor(score: number): QualityStatus {
  if (score >= 0.8) return 'excellent';
  if (score >= 0.6) return 'good';
  return 'needs_review';
}

function round(n: number): number {
  return Number(n.toFixed(3));
}
