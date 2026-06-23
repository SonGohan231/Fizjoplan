import type { ExerciseInput } from '../types';
import { EN_PL_GLOSSARY } from '../data/glossary';

// ---------------------------------------------------------------------------
// Translation pipeline (EN -> PL). Built around a provider interface so the
// offline glossary provider can later be swapped for / augmented by an LLM
// provider WITHOUT changing callers. Every translation carries a 0..1 quality
// score so the import studio can flag low-quality output for human review.
// ---------------------------------------------------------------------------

export interface TranslationOutput {
  text: string;
  /** 0..1 estimate of translation quality (glossary coverage based). */
  quality: number;
}

export interface TranslationProvider {
  name: string;
  translate(text: string): TranslationOutput;
}

// Precompute glossary entries sorted longest-first so multi-word terms win.
const GLOSSARY_ENTRIES = Object.entries(EN_PL_GLOSSARY).sort((a, b) => b[0].length - a[0].length);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Offline glossary provider. Performs longest-match term substitution and
 * estimates quality from how much of the (alphabetic) content it covered.
 */
export class GlossaryTranslationProvider implements TranslationProvider {
  name = 'glossary-offline';

  translate(text: string): TranslationOutput {
    if (!text || !text.trim()) return { text: '', quality: 1 };
    let out = text;
    let translatedChars = 0;
    const totalAlpha = (text.match(/[a-zA-Z]/g) ?? []).length || 1;

    for (const [en, pl] of GLOSSARY_ENTRIES) {
      const re = new RegExp(`\\b${escapeRegExp(en)}\\b`, 'gi');
      let matched = false;
      out = out.replace(re, () => { matched = true; return pl; });
      if (matched) {
        const count = (text.match(re) ?? []).length;
        translatedChars += count * en.replace(/[^a-zA-Z]/g, '').length;
      }
    }

    // Coverage = share of alphabetic characters that mapped to a glossary term.
    const coverage = Math.min(1, translatedChars / totalAlpha);
    // Residual English words lower confidence (untranslated leftovers).
    const residualEnglish = (out.match(/[a-zA-Z]{4,}/g) ?? []).length;
    const residualPenalty = Math.min(0.4, residualEnglish * 0.03);
    const quality = Math.max(0, Math.min(1, 0.5 + 0.5 * coverage - residualPenalty));

    return { text: out, quality: Number(quality.toFixed(3)) };
  }
}

export const defaultTranslationProvider: TranslationProvider = new GlossaryTranslationProvider();

// --- Exercise-level translation -------------------------------------------

export interface ExerciseTranslationSource {
  title_en?: string | null;
  description_en?: string | null;
  progression_en?: string | null;
  regression_en?: string | null;
  precautions_en?: string | null;
}

export interface ExerciseTranslationResult {
  title_pl: string;
  description_pl: string;
  progression_pl: string | null;
  regression_pl: string | null;
  precautions_pl: string | null;
  /** Mean field quality, 0..1. */
  quality: number;
  qualityLabel: 'excellent' | 'good' | 'needs_review';
}

export function qualityLabel(q: number): ExerciseTranslationResult['qualityLabel'] {
  if (q >= 0.8) return 'excellent';
  if (q >= 0.6) return 'good';
  return 'needs_review';
}

export function translateExerciseFields(
  src: ExerciseTranslationSource,
  provider: TranslationProvider = defaultTranslationProvider,
): ExerciseTranslationResult {
  const t = (s?: string | null) => (s && s.trim() ? provider.translate(s) : null);
  const title = t(src.title_en);
  const desc = t(src.description_en);
  const prog = t(src.progression_en);
  const regr = t(src.regression_en);
  const prec = t(src.precautions_en);

  const parts = [title, desc, prog, regr, prec].filter(Boolean) as TranslationOutput[];
  const quality = parts.length ? Number((parts.reduce((s, p) => s + p.quality, 0) / parts.length).toFixed(3)) : 0;

  return {
    title_pl: title?.text ?? '',
    description_pl: desc?.text ?? '',
    progression_pl: prog?.text ?? null,
    regression_pl: regr?.text ?? null,
    precautions_pl: prec?.text ?? null,
    quality,
    qualityLabel: qualityLabel(quality),
  };
}

/** Fill missing Polish fields of a record by translating its English source. */
export function translateRecord(
  rec: ExerciseInput & ExerciseTranslationSource,
  provider: TranslationProvider = defaultTranslationProvider,
): { record: ExerciseInput; quality: number } {
  const r = translateExerciseFields(
    {
      title_en: rec.title_en,
      description_en: rec.description_en,
      progression_en: (rec as any).progression_en,
      regression_en: (rec as any).regression_en,
      precautions_en: (rec as any).precautions_en,
    },
    provider,
  );
  const out: ExerciseInput = { ...rec };
  if ((!out.title_pl || !out.title_pl.trim()) && r.title_pl) out.title_pl = r.title_pl;
  if ((!out.description_pl || !out.description_pl.trim()) && r.description_pl) out.description_pl = r.description_pl;
  if (!out.progression && r.progression_pl) out.progression = r.progression_pl;
  if (!out.regression && r.regression_pl) out.regression = r.regression_pl;
  return { record: out, quality: r.quality };
}

/** Batch translation with an aggregate quality summary. */
export function translateBatch(
  records: (ExerciseInput & ExerciseTranslationSource)[],
  provider: TranslationProvider = defaultTranslationProvider,
): { records: ExerciseInput[]; meanQuality: number; needsReview: number } {
  let qSum = 0;
  let needsReview = 0;
  const out = records.map((rec) => {
    const { record, quality } = translateRecord(rec, provider);
    qSum += quality;
    if (quality < 0.6) needsReview += 1;
    return record;
  });
  return { records: out, meanQuality: records.length ? Number((qSum / records.length).toFixed(3)) : 0, needsReview };
}
