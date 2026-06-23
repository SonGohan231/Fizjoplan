// ---------------------------------------------------------------------------
// Core domain types. These mirror the Supabase `exercises` table 1:1 and are
// shared by the engine (analyzer / matcher / plan generator), the services
// layer, and the UI. Keep this file as the single source of truth.
// ---------------------------------------------------------------------------

/** Body regions the app understands. 'general' = whole-body / not region-specific. */
export type BodyRegion =
  | 'neck'
  | 'shoulder'
  | 'elbow'
  | 'wrist_hand'
  | 'thoracic'
  | 'lower_back'
  | 'hip'
  | 'knee'
  | 'ankle_foot'
  | 'general';

/** User-facing difficulty. Mapped to ints for storage / comparison. */
export type DifficultyLevel = 'easy' | 'medium' | 'advanced';

export const DIFFICULTY_TO_INT: Record<DifficultyLevel, number> = {
  easy: 1,
  medium: 2,
  advanced: 3,
};

export const INT_TO_DIFFICULTY: Record<number, DifficultyLevel> = {
  1: 'easy',
  2: 'medium',
  3: 'advanced',
};

/**
 * The exercise record. Tag fields are free-ish controlled vocabularies kept as
 * string[] so the database stays flexible while the engine matches on overlap.
 * See src/engine/vocabulary.ts for the canonical tag values.
 */
export interface Exercise {
  id: string;
  title_pl: string;
  title_en: string | null;
  description_pl: string;
  description_en: string | null;
  body_region: BodyRegion;
  condition_tags: string[]; // e.g. 'tendinopathy', 'post_acl', 'osteoarthritis'
  tissue_tags: string[]; // e.g. 'tendon', 'muscle', 'joint_capsule'
  goal_tags: string[]; // e.g. 'mobility', 'strength', 'stability', 'stretch'
  difficulty_level: number; // 1=easy, 2=medium, 3=advanced
  equipment: string[]; // e.g. 'none', 'resistance_band', 'chair'
  position: string | null; // e.g. 'standing', 'supine', 'seated'
  contraindications: string[]; // analyzer flags that should EXCLUDE this exercise
  red_flags: string[]; // serious-symptom flags associated with this exercise
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  frequency_per_week: number | null;
  progression: string | null;
  regression: string | null;
  image_url: string | null;
  video_url: string | null;
  source_url: string | null;
  license_note: string | null;
}

/** Input shape for creating/updating exercises in the admin panel. */
export type ExerciseInput = Omit<Exercise, 'id'> & { id?: string };

// ---------------------------------------------------------------------------
// Analyzer output. The rule-based analyzer and a future LLM analyzer MUST both
// return this exact shape, so the matcher never needs to know which produced it.
// ---------------------------------------------------------------------------

export interface AnalysisResult {
  /** Original free-text complaint. */
  rawText: string;
  /** Detected body regions, most likely first. */
  regions: BodyRegion[];
  /** Detected condition/problem tags. */
  conditionTags: string[];
  /** Rehab goal tags inferred from the complaint. */
  goalTags: string[];
  /** Flags that should exclude matching exercises (e.g. 'acute_inflammation'). */
  contraindicationFlags: string[];
  /** Higher-level caution states (see SAFETY_CATEGORIES), e.g. 'pregnancy_caution'. */
  safetyCategories: string[];
  /** Serious symptoms suggesting medical review before exercising. */
  redFlags: RedFlagHit[];
  /** 0..1 rough confidence that we understood the complaint at all. */
  confidence: number;
  /** Which engine produced this result (for debugging / future swap). */
  source: 'rule-based' | 'llm';
}

/** A single clarifying question offered when confidence is low. */
export interface ClarifyingQuestion {
  id: string;
  question_pl: string;
  options: { label_pl: string; value: string }[];
}

export interface RedFlagHit {
  code: string;
  /** Polish patient-facing explanation. */
  message_pl: string;
}

// ---------------------------------------------------------------------------
// Plan generator output.
// ---------------------------------------------------------------------------

export interface PlanExercise {
  exercise: Exercise;
  sets: number;
  reps: number | null;
  duration_seconds: number | null;
  note_pl: string | null;
}

export interface RehabPlan {
  problemSummary_pl: string;
  level: DifficultyLevel;
  /** True when this is a gentle safety-first plan (red flag / post-surgery / acute). */
  isSafetyPlan: boolean;
  safetyNotes_pl: string[];
  redFlags: RedFlagHit[];
  exercises: PlanExercise[];
  weeklyFrequency_pl: string;
  progressionAdvice_pl: string;
  stopWarningSigns_pl: string[];
  disclaimer_pl: string;
  generatedAt: string; // ISO
}
