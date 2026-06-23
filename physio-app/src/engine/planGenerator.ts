import type {
  AnalysisResult,
  DifficultyLevel,
  Exercise,
  PlanExercise,
  RehabPlan,
} from '../types';
import { matchExercises, isExerciseSafe, ScoredExercise } from './matcher';
import { HALT_CATEGORIES } from './vocabulary';

// ---------------------------------------------------------------------------
// Plan generator. Turns an AnalysisResult + chosen level + exercise pool into a
// structured RehabPlan. All patient-facing text uses cautious, non-diagnostic
// Polish ("możliwy problem", "propozycja ćwiczeń", "skonsultuj się...").
//
// If a red flag or a HALT safety category (red_flag / post_surgery / acute_pain)
// is present, we DO NOT generate a normal exercise plan. Instead we return a
// gentle "safety plan": a warning plus only very gentle walking / breathing /
// mobility, and a strong recommendation to consult a professional first.
// ---------------------------------------------------------------------------

const MAX_EXERCISES = 8;
const MIN_EXERCISES = 5;

const LEVEL_DOSE: Record<DifficultyLevel, { sets: number; reps: number; frequency_pl: string }> = {
  easy: { sets: 2, reps: 10, frequency_pl: '2–3 razy w tygodniu' },
  medium: { sets: 3, reps: 12, frequency_pl: '3–4 razy w tygodniu' },
  advanced: { sets: 3, reps: 15, frequency_pl: '4–5 razy w tygodniu' },
};

const REGION_LABEL_PL: Record<string, string> = {
  neck: 'odcinka szyjnego',
  shoulder: 'barku',
  elbow: 'łokcia',
  wrist_hand: 'nadgarstka/ręki',
  thoracic: 'odcinka piersiowego',
  lower_back: 'dolnego odcinka kręgosłupa',
  hip: 'biodra',
  knee: 'kolana',
  ankle_foot: 'stawu skokowego/stopy',
  general: 'ogólnej sprawności',
};

const CONDITION_LABEL_PL: Record<string, string> = {
  tendinopathy: 'przeciążenia ścięgna (tendinopatia)',
  osteoarthritis: 'zmian zwyrodnieniowych',
  general_deconditioning: 'ogólnego obniżenia kondycji',
  general_mobility: 'pracy nad ogólną mobilnością',
  postural_overload: 'przeciążenia posturalnego (np. praca siedząca)',
  neck_pain: 'bólu odcinka szyjnego',
  cervical_radiculopathy: 'objawów korzeniowych z odcinka szyjnego (tryb ostrożny)',
  shoulder_impingement: 'konfliktu podbarkowego',
  rotator_cuff_tendinopathy: 'przeciążenia stożka rotatorów',
  frozen_shoulder: 'ograniczenia ruchomości barku („zamrożony bark”)',
  lateral_epicondylalgia: 'tzw. łokcia tenisisty',
  medial_epicondylalgia: 'tzw. łokcia golfisty',
  carpal_tunnel: 'objawów zespołu cieśni nadgarstka',
  thoracic_stiffness: 'sztywności odcinka piersiowego',
  mechanical_low_back_pain: 'mechanicznego bólu dolnego odcinka pleców',
  sciatica: 'objawów rwy kulszowej (tryb ostrożny)',
  hip_pain: 'bólu biodra',
  hip_impingement: 'konfliktu w obrębie biodra',
  gluteal_tendinopathy: 'przeciążenia przyczepów pośladkowych',
  knee_pain: 'bólu kolana',
  patellofemoral_pain: 'bólu rzepkowo-udowego (z przodu kolana)',
  post_acl: 'okresu po rekonstrukcji więzadła krzyżowego (ACL)',
  ankle_sprain: 'po skręceniu stawu skokowego',
  achilles_tendinopathy: 'przeciążenia ścięgna Achillesa',
  balance_senior: 'pracy nad równowagą i stabilnością',
};

const DISCLAIMER_PL =
  'To narzędzie nie stawia diagnozy medycznej. Powyższe to wyłącznie propozycja ćwiczeń o charakterze edukacyjnym. ' +
  'Jeśli objawy się nasilają, nie ustępują lub pojawiają się nowe dolegliwości — skonsultuj się z fizjoterapeutą lub lekarzem.';

function haltReason(analysis: AnalysisResult): string | null {
  if (analysis.redFlags.length > 0) return 'red_flag';
  const halt = analysis.safetyCategories.find((c) => HALT_CATEGORIES.includes(c as any));
  return halt ?? null;
}

function buildProblemSummary(analysis: AnalysisResult): string {
  const region = analysis.regions[0] ?? 'general';
  const regionLabel = REGION_LABEL_PL[region] ?? 'wskazanej okolicy';
  const conditionLabel =
    analysis.conditionTags.length > 0 ? CONDITION_LABEL_PL[analysis.conditionTags[0]] ?? null : null;

  let summary = `Na podstawie opisu możliwy problem dotyczy ${regionLabel}`;
  if (conditionLabel) summary += `, co może sugerować obraz ${conditionLabel}`;
  summary += '. ';

  if (analysis.confidence < 0.5) {
    summary += 'Opis jest dość ogólny — dla większej trafności doprecyzuj lokalizację i okoliczności bólu.';
  } else {
    summary += 'Poniżej znajdziesz propozycję bezpiecznych ćwiczeń dopasowaną do tego opisu.';
  }
  return summary;
}

function buildSafetyNotes(analysis: AnalysisResult): string[] {
  const notes: string[] = [
    'Wykonuj ćwiczenia powoli i w zakresie bezbolesnym — lekki dyskomfort jest dopuszczalny, ostry ból nie.',
    'Jeśli ćwiczenie wyraźnie nasila ból, przerwij je i wróć do łatwiejszej wersji (regresja).',
  ];
  if (analysis.contraindicationFlags.includes('acute_inflammation')) {
    notes.push('W fazie ostrej (obrzęk, zaczerwienienie, ucieplenie) ogranicz obciążenie i rozważ konsultację przed ćwiczeniami.');
  }
  if (analysis.contraindicationFlags.includes('instability')) {
    notes.push('Przy uczuciu „uciekania” stawu skup się na ćwiczeniach stabilizacyjnych i unikaj gwałtownych ruchów.');
  }
  if (analysis.safetyCategories.includes('neurological_symptoms')) {
    notes.push('Przy drętwieniu/mrowieniu pracuj wyłącznie w zakresie, który NIE nasila objawów neurologicznych. Jeśli objawy się nasilają — przerwij i skonsultuj się ze specjalistą.');
  }
  if (analysis.safetyCategories.includes('osteoporosis_caution')) {
    notes.push('Przy osteoporozie unikaj głębokich skłonów w przód i gwałtownych skrętów kręgosłupa pod obciążeniem.');
  }
  if (analysis.safetyCategories.includes('pregnancy_caution')) {
    notes.push('W ciąży dobór ćwiczeń skonsultuj z lekarzem/fizjoterapeutą; unikaj długiego leżenia na plecach w późniejszych trymestrach i ćwiczeń z parciem.');
  }
  if (analysis.safetyCategories.includes('elderly_caution')) {
    notes.push('Wykonuj ćwiczenia w bezpiecznym otoczeniu, w razie potrzeby z podparciem (krzesło, blat), aby zmniejszyć ryzyko upadku.');
  }
  if (analysis.safetyCategories.includes('high_irritability')) {
    notes.push('Objawy wydają się łatwo prowokowane — zacznij od bardzo małej dawki (mniej powtórzeń i serii) i obserwuj reakcję przez 24 h.');
  }
  return notes;
}

function buildStopWarnings(): string[] {
  return [
    'Narastający, ostry lub promieniujący ból.',
    'Drętwienie, mrowienie lub osłabienie kończyny.',
    'Wyraźny obrzęk, zaczerwienienie lub ucieplenie stawu.',
    'Ból budzący w nocy, gorączka lub złe samopoczucie ogólne.',
  ];
}

function buildProgressionAdvice(level: DifficultyLevel): string {
  if (level === 'easy') {
    return 'Gdy ćwiczenia staną się łatwe i bezbolesne przez ~1 tydzień, zwiększ liczbę powtórzeń lub serii, a następnie przejdź na poziom średni.';
  }
  if (level === 'medium') {
    return 'Jeśli ćwiczenia wykonujesz pewnie i bez bólu, stopniowo zwiększaj obciążenie/tempo lub przejdź na poziom zaawansowany.';
  }
  return 'Utrzymuj progresję przez zwiększanie obciążenia, tempa lub trudności wariantów — zawsze zachowując poprawną technikę i kontrolę bólu.';
}

function toPlanExercise(scored: ScoredExercise, level: DifficultyLevel, reduceDose = false): PlanExercise {
  const ex = scored.exercise;
  const dose = LEVEL_DOSE[level];
  const sets = reduceDose ? Math.max(1, (ex.sets ?? dose.sets) - 1) : ex.sets ?? dose.sets;
  return {
    exercise: ex,
    sets,
    reps: ex.reps ?? (ex.duration_seconds ? null : dose.reps),
    duration_seconds: ex.duration_seconds,
    note_pl: ex.regression ? `Wersja łatwiejsza: ${ex.regression}` : null,
  };
}

/** Prefer covering different goal_tags so the plan isn't all stretch or all strength. */
function selectVaried(scored: ScoredExercise[], limit: number): ScoredExercise[] {
  const picked: ScoredExercise[] = [];
  const coveredGoals = new Set<string>();
  for (const s of scored) {
    if (picked.length >= limit) break;
    if (s.exercise.goal_tags.some((g) => !coveredGoals.has(g))) {
      picked.push(s);
      s.exercise.goal_tags.forEach((g) => coveredGoals.add(g));
    }
  }
  for (const s of scored) {
    if (picked.length >= limit) break;
    if (!picked.includes(s)) picked.push(s);
  }
  return picked;
}

export interface GeneratePlanParams {
  analysis: AnalysisResult;
  level: DifficultyLevel;
  exercises: Exercise[];
}

// --- Gentle safety plan (red flag / post-surgery / acute) ------------------

function buildSafetyPlan(params: GeneratePlanParams, reason: string): RehabPlan {
  const { analysis, exercises } = params;

  // Only very gentle, level-1, low-risk movement: breathing / circulation /
  // gentle mobility — and only if independently safe for this analysis.
  const gentle = exercises
    .filter((ex) => isExerciseSafe(ex, analysis))
    .filter(
      (ex) =>
        ex.difficulty_level === 1 &&
        (ex.goal_tags.includes('breathing') ||
          ex.goal_tags.includes('circulation') ||
          (ex.goal_tags.includes('mobility') && ex.contraindications.length === 0)),
    )
    .slice(0, 3)
    .map((ex) => ({
      exercise: ex,
      sets: ex.sets ?? 1,
      reps: ex.reps,
      duration_seconds: ex.duration_seconds,
      note_pl: 'Wykonuj wyłącznie jeśli nie nasila objawów.',
    }));

  const reasonText =
    reason === 'red_flag'
      ? 'W opisie pojawiły się objawy alarmowe.'
      : reason === 'post_surgery'
      ? 'Opis wskazuje na okres pooperacyjny.'
      : 'Opis wskazuje na ostrą, świeżą fazę dolegliwości.';

  return {
    problemSummary_pl:
      `${reasonText} Z tego powodu NIE generujemy pełnego planu ćwiczeń. ` +
      'Najpierw skonsultuj się z lekarzem lub fizjoterapeutą. Poniżej znajdziesz wyłącznie bardzo łagodne, ogólne formy aktywności, ' +
      'które zwykle są bezpieczne — wykonuj je tylko, jeśli nie nasilają objawów.',
    level: 'easy',
    isSafetyPlan: true,
    safetyNotes_pl: [
      'To NIE jest plan rehabilitacyjny — to tymczasowe, bezpieczne minimum ruchu do czasu konsultacji.',
      'Nie wykonuj intensywnych ćwiczeń ani rozciągania „na siłę”, dopóki specjalista nie oceni problemu.',
      'Jeśli objawy się nasilają, skontaktuj się z lekarzem niezwłocznie.',
    ],
    redFlags: analysis.redFlags,
    exercises: gentle,
    weeklyFrequency_pl: 'codziennie krótko, w komfortowym zakresie',
    progressionAdvice_pl: 'Nie zwiększaj obciążenia samodzielnie — progresję ustal ze specjalistą po ocenie.',
    stopWarningSigns_pl: buildStopWarnings(),
    disclaimer_pl: DISCLAIMER_PL,
    generatedAt: new Date().toISOString(),
  };
}

export function generatePlan(params: GeneratePlanParams): RehabPlan {
  const { analysis, level, exercises } = params;

  const halt = haltReason(analysis);
  if (halt) return buildSafetyPlan(params, halt);

  const reduceDose = analysis.safetyCategories.includes('high_irritability');
  const matched = matchExercises(exercises, analysis, { level, capDifficulty: true });
  const selectedScored = selectVaried(matched, MAX_EXERCISES);
  const planExercises = selectedScored.map((s) => toPlanExercise(s, level, reduceDose));

  const dose = LEVEL_DOSE[level];

  return {
    problemSummary_pl: buildProblemSummary(analysis),
    level,
    isSafetyPlan: false,
    safetyNotes_pl: buildSafetyNotes(analysis),
    redFlags: analysis.redFlags,
    exercises: planExercises,
    weeklyFrequency_pl: dose.frequency_pl,
    progressionAdvice_pl: buildProgressionAdvice(level),
    stopWarningSigns_pl: buildStopWarnings(),
    disclaimer_pl: DISCLAIMER_PL,
    generatedAt: new Date().toISOString(),
  };
}

/** True when the plan has too few exercises to be useful. */
export function planIsThin(plan: RehabPlan): boolean {
  return !plan.isSafetyPlan && plan.exercises.length < MIN_EXERCISES;
}
