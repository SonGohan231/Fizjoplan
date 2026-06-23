import type { AnalysisResult, DifficultyLevel, Exercise } from '../types';
import { DIFFICULTY_TO_INT } from '../types';

// ---------------------------------------------------------------------------
// Matching engine. Scores each exercise against the analysis and the chosen
// difficulty level, after hard safety + relevance filtering.
//
// Priorities (per sprint spec):
//   1. prefer SAME region
//   2. prefer EXACT condition match
//   3. never exceed the user's chosen difficulty (and cap to 'easy' when the
//      complaint reads as highly irritable)
// ---------------------------------------------------------------------------

export interface ScoredExercise {
  exercise: Exercise;
  score: number;
  reasons: string[];
}

function overlap(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

const WEIGHTS = {
  condition: 6, // EXACT condition is the top priority
  regionExact: 4, // + 1 for the primary region
  regionGeneral: 1,
  tissue: 2, // same tissue ranks above goal
  goal: 1, // light tie-breaker only
  difficultyExact: 1,
} as const;

// Tissue expected for a condition — lets us honour the "same tissue" priority
// without changing the AnalysisResult contract.
const CONDITION_TISSUE: Record<string, string[]> = {
  tendinopathy: ['tendon'], rotator_cuff_tendinopathy: ['tendon'],
  lateral_epicondylalgia: ['tendon'], medial_epicondylalgia: ['tendon'],
  gluteal_tendinopathy: ['tendon'], achilles_tendinopathy: ['tendon'],
  sciatica: ['nerve'], cervical_radiculopathy: ['nerve'], carpal_tunnel: ['nerve'],
  ankle_sprain: ['ligament'], frozen_shoulder: ['joint_capsule'],
  thoracic_stiffness: ['joint_capsule'], osteoarthritis: ['cartilage'],
  patellofemoral_pain: ['muscle'], post_acl: ['muscle', 'ligament'],
};

function expectedTissues(analysis: AnalysisResult): string[] {
  const out = new Set<string>();
  for (const c of analysis.conditionTags) (CONDITION_TISSUE[c] ?? []).forEach((t) => out.add(t));
  return [...out];
}

/**
 * Hard safety filter — excluded exercises never appear in a plan.
 * An exercise is unsafe when its `contraindications` intersect EITHER the
 * acute-phase flags OR the higher-level safety categories the analyzer detected
 * (e.g. an exercise tagged 'osteoporosis_caution' is dropped for an osteoporotic
 * complaint), or when a detected red-flag code is tied to it.
 */
export function isExerciseSafe(exercise: Exercise, analysis: AnalysisResult): boolean {
  const detectedExclusions = [...analysis.contraindicationFlags, ...analysis.safetyCategories];
  if (overlap(exercise.contraindications, detectedExclusions).length > 0) {
    return false;
  }
  const redCodes = analysis.redFlags.map((r) => r.code);
  if (overlap(exercise.red_flags, redCodes).length > 0) {
    return false;
  }
  return true;
}

/**
 * Topical relevance gate. Prevents goal-only cross-region bleed (e.g. a back
 * exercise surfacing for a tennis-elbow complaint via a shared 'pain_relief'
 * goal). Qualifies when it targets a detected region, is a 'general' whole-body
 * exercise, or shares at least one specific condition tag.
 */
export function isRelevant(exercise: Exercise, analysis: AnalysisResult): boolean {
  if (analysis.regions.includes(exercise.body_region)) return true;
  if (exercise.body_region === 'general') return true;
  if (overlap(exercise.condition_tags, analysis.conditionTags).length > 0) return true;
  return false;
}

export function scoreExercise(
  exercise: Exercise,
  analysis: AnalysisResult,
  level: DifficultyLevel,
): ScoredExercise {
  const reasons: string[] = [];
  let score = 0;

  // Region — strong preference for the primary detected region.
  if (analysis.regions.includes(exercise.body_region)) {
    const primary = analysis.regions[0] === exercise.body_region;
    score += WEIGHTS.regionExact + (primary ? 1 : 0);
    reasons.push(`region:${exercise.body_region}${primary ? '(primary)' : ''}`);
  } else if (exercise.body_region === 'general') {
    score += WEIGHTS.regionGeneral;
    reasons.push('region:general');
  }

  // Conditions — exact matches are the highest-value signal.
  const condHits = overlap(exercise.condition_tags, analysis.conditionTags);
  if (condHits.length) {
    score += WEIGHTS.condition * condHits.length;
    reasons.push(`condition:${condHits.join(',')}`);
  }

  // Tissue — same tissue as the implicated condition ranks above goal.
  const tissueHits = overlap(exercise.tissue_tags, expectedTissues(analysis));
  if (tissueHits.length) {
    score += WEIGHTS.tissue * tissueHits.length;
    reasons.push(`tissue:${tissueHits.join(',')}`);
  }

  // Goals — light tie-breaker only.
  const goalHits = overlap(exercise.goal_tags, analysis.goalTags);
  if (goalHits.length) {
    score += WEIGHTS.goal * goalHits.length;
    reasons.push(`goal:${goalHits.join(',')}`);
  }

  // Difficulty: exact match to chosen level gets a small bonus.
  if (exercise.difficulty_level === DIFFICULTY_TO_INT[level]) {
    score += WEIGHTS.difficultyExact;
  }

  return { exercise, score, reasons };
}

export interface MatchOptions {
  level: DifficultyLevel;
  /** Only include exercises with difficulty_level <= chosen level. Default true. */
  capDifficulty?: boolean;
}

/**
 * Effective difficulty cap. The user's chosen level is the ceiling; a highly
 * irritable presentation forces it down to 'easy' regardless of choice.
 */
export function effectiveLevelCap(level: DifficultyLevel, analysis: AnalysisResult): number {
  let cap = DIFFICULTY_TO_INT[level];
  if (analysis.safetyCategories.includes('high_irritability')) cap = Math.min(cap, DIFFICULTY_TO_INT.easy);
  if (analysis.safetyCategories.includes('elderly_caution')) cap = Math.min(cap, DIFFICULTY_TO_INT.medium);
  return cap;
}

/**
 * Main entry point: filter (safety + relevance + difficulty), score, and rank.
 */
export function matchExercises(
  exercises: Exercise[],
  analysis: AnalysisResult,
  options: MatchOptions,
): ScoredExercise[] {
  const capDifficulty = options.capDifficulty ?? true;
  const cap = effectiveLevelCap(options.level, analysis);

  return exercises
    .filter((ex) => isExerciseSafe(ex, analysis))
    .filter((ex) => isRelevant(ex, analysis))
    .filter((ex) => (capDifficulty ? ex.difficulty_level <= cap : true))
    .map((ex) => scoreExercise(ex, analysis, options.level))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}
