import type { BodyRegion, ExerciseInput } from '../types';
import { normalize } from './analyzer';
import {
  REGION_TAG_RULES, CONDITION_TAG_RULES, GOAL_TAG_RULES, TISSUE_TAG_RULES,
  EQUIPMENT_TAG_RULES, POSITION_TAG_RULES, DIFFICULTY_CUES, TagRule,
} from './taggingRules';

// ---------------------------------------------------------------------------
// Auto-tagging engine. Infers structured metadata from an exercise's free text
// (title weighted higher than body) and reports a 0..1 confidence per tag.
//
// This is rule-based and fully offline. The same TaggingResult contract can be
// produced by a future LLM tagger, so callers don't change.
// ---------------------------------------------------------------------------

export interface TagSuggestion {
  value: string;
  confidence: number; // 0..1
}

export interface TaggingResult {
  body_region: TagSuggestion | null;
  condition_tags: TagSuggestion[];
  tissue_tags: TagSuggestion[];
  goal_tags: TagSuggestion[];
  equipment: TagSuggestion[];
  position: TagSuggestion | null;
  difficulty_level: TagSuggestion | null; // value is '1' | '2' | '3'
  /** Overall mean confidence across produced tags. */
  overallConfidence: number;
}

const TITLE_WEIGHT = 2; // a hit in the title counts double

function scoreRule(rule: TagRule, title: string, body: string): { hits: number; weighted: number } {
  let hits = 0;
  let weighted = 0;
  for (const kw of rule.keywords) {
    const n = normalize(kw);
    if (!n) continue;
    const inTitle = title.includes(n);
    const inBody = body.includes(n);
    if (inTitle || inBody) {
      hits += 1;
      weighted += (inTitle ? TITLE_WEIGHT : 1) * (rule.weight ?? 1);
    }
  }
  return { hits, weighted };
}

/** Map a weighted hit count to a 0..1 confidence (saturating). */
function toConfidence(weighted: number): number {
  if (weighted <= 0) return 0;
  // 1 body hit ~0.45, 1 title hit ~0.6, 2+ strong hits -> ~0.8-0.95
  return Math.min(0.97, 0.3 + 0.22 * weighted);
}

function rankMulti(rules: TagRule[], title: string, body: string, limit: number): TagSuggestion[] {
  const out: TagSuggestion[] = [];
  for (const r of rules) {
    const { weighted } = scoreRule(r, title, body);
    if (weighted > 0) out.push({ value: r.tag, confidence: toConfidence(weighted) });
  }
  return out.sort((a, b) => b.confidence - a.confidence).slice(0, limit);
}

function rankSingle(rules: TagRule[], title: string, body: string): TagSuggestion | null {
  return rankMulti(rules, title, body, 1)[0] ?? null;
}

export interface TaggingInput {
  title_pl?: string | null;
  title_en?: string | null;
  description_pl?: string | null;
  description_en?: string | null;
}

export function autoTag(input: TaggingInput): TaggingResult {
  const title = ' ' + normalize([input.title_en, input.title_pl].filter(Boolean).join(' ')) + ' ';
  const body = ' ' + normalize([input.description_en, input.description_pl].filter(Boolean).join(' ')) + ' ';

  const region = rankSingle(REGION_TAG_RULES as TagRule[], title, body);
  const conditions = rankMulti(CONDITION_TAG_RULES, title, body, 4);
  const tissues = rankMulti(TISSUE_TAG_RULES, title, body, 3);
  const goals = rankMulti(GOAL_TAG_RULES, title, body, 4);
  const equipment = rankMulti(EQUIPMENT_TAG_RULES, title, body, 3);
  const position = rankSingle(POSITION_TAG_RULES, title, body);

  // Difficulty: start neutral (2), nudge by cue hits.
  let level = 2;
  let diffConfidence = 0.4;
  for (const cue of DIFFICULTY_CUES) {
    const hits = cue.keywords.reduce((acc, kw) => acc + (title.includes(normalize(kw)) || body.includes(normalize(kw)) ? 1 : 0), 0);
    if (hits > 0) { level = cue.level; diffConfidence = Math.min(0.9, 0.5 + 0.15 * hits); }
  }
  const difficulty: TagSuggestion = { value: String(level), confidence: diffConfidence };

  const all = [region, position, difficulty, ...conditions, ...tissues, ...goals, ...equipment].filter(Boolean) as TagSuggestion[];
  const overall = all.length ? all.reduce((s, t) => s + t.confidence, 0) / all.length : 0;

  return {
    body_region: region,
    condition_tags: conditions,
    tissue_tags: tissues,
    goal_tags: goals,
    equipment,
    position,
    difficulty_level: difficulty,
    overallConfidence: Number(overall.toFixed(3)),
  };
}

/**
 * Apply tagging to fill ONLY missing fields of a record (never overwrites
 * curated values). Returns the enriched record plus the raw suggestions.
 */
export function enrichWithTags(
  rec: ExerciseInput,
  opts: { minConfidence?: number } = {},
): { record: ExerciseInput; suggestions: TaggingResult } {
  const min = opts.minConfidence ?? 0.5;
  const s = autoTag(rec);
  const out: ExerciseInput = { ...rec };

  if ((!out.body_region || out.body_region === ('' as any)) && s.body_region && s.body_region.confidence >= min) {
    out.body_region = s.body_region.value as BodyRegion;
  }
  const fill = (cur: string[] | undefined, sugg: TagSuggestion[]) =>
    cur && cur.length ? cur : sugg.filter((x) => x.confidence >= min).map((x) => x.value);

  out.condition_tags = fill(out.condition_tags, s.condition_tags);
  out.tissue_tags = fill(out.tissue_tags, s.tissue_tags);
  out.goal_tags = fill(out.goal_tags, s.goal_tags);
  out.equipment = fill(out.equipment, s.equipment);
  if (!out.position && s.position && s.position.confidence >= min) out.position = s.position.value;
  if ((!out.difficulty_level || Number.isNaN(out.difficulty_level)) && s.difficulty_level) {
    out.difficulty_level = Number(s.difficulty_level.value);
  }
  return { record: out, suggestions: s };
}
