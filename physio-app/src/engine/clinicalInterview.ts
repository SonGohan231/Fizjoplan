import type { AnalysisResult, BodyRegion } from '../types';
import { analyzeComplaint } from './analyzer';

// ---------------------------------------------------------------------------
// Dynamic clinical interview. Given a free-text complaint (and/or a tapped body
// region), it asks up to 10 targeted questions, then folds the answers back into
// the analyzer to produce a higher-confidence AnalysisResult.
//
// Questions are CONDITIONAL: we only ask what we still need. Answers are stored
// as { questionId: value } and appended as natural-language hints to the text
// that analyzeComplaint() already understands.
// ---------------------------------------------------------------------------

export interface InterviewOption { label_pl: string; value: string; hint?: string }
export interface InterviewQuestion {
  id: string;
  question_pl: string;
  options: InterviewOption[];
  /** free-text answers allowed (e.g. age). */
  freeText?: boolean;
}

export interface InterviewState {
  rawText: string;
  region?: BodyRegion;
  answers: Record<string, string>;
}

const MAX_QUESTIONS = 10;

const REGION_OPTIONS: InterviewOption[] = [
  { label_pl: 'Szyja / kark', value: 'neck', hint: 'ból szyi' },
  { label_pl: 'Bark', value: 'shoulder', hint: 'ból barku' },
  { label_pl: 'Łokieć', value: 'elbow', hint: 'ból łokcia' },
  { label_pl: 'Nadgarstek / ręka', value: 'wrist_hand', hint: 'ból nadgarstka' },
  { label_pl: 'Odcinek piersiowy', value: 'thoracic', hint: 'sztywność odcinka piersiowego' },
  { label_pl: 'Dolny odcinek pleców', value: 'lower_back', hint: 'ból dolnego odcinka pleców' },
  { label_pl: 'Biodro', value: 'hip', hint: 'ból biodra' },
  { label_pl: 'Kolano', value: 'knee', hint: 'ból kolana' },
  { label_pl: 'Kostka / stopa', value: 'ankle_foot', hint: 'ból kostki' },
];

/** Build the full ordered question bank, then filter to what's still needed. */
function questionBank(state: InterviewState, analysis: AnalysisResult): InterviewQuestion[] {
  const qs: InterviewQuestion[] = [];

  if (!state.region && analysis.regions[0] === 'general') {
    qs.push({ id: 'region', question_pl: 'Której okolicy ciała dotyczy problem?', options: REGION_OPTIONS });
  }
  qs.push({
    id: 'onset', question_pl: 'Od kiedy występują dolegliwości?',
    options: [
      { label_pl: 'Do 2 tygodni (świeże)', value: 'od kilku dni ostry swiezy bol' },
      { label_pl: '2–6 tygodni', value: 'od kilku tygodni' },
      { label_pl: 'Ponad 6 tygodni (przewlekłe)', value: 'od wielu tygodni przewlekle' },
    ],
  });
  qs.push({
    id: 'aggravating', question_pl: 'Co najbardziej nasila ból?',
    options: [
      { label_pl: 'Długie siedzenie / bezruch', value: 'nasila sie po siedzeniu praca biurowa' },
      { label_pl: 'Ruch i obciążenie', value: 'nasila sie przy ruchu i obciazeniu' },
      { label_pl: 'Konkretna czynność', value: 'nasila przy okreslonej czynnosci' },
    ],
  });
  qs.push({
    id: 'easing', question_pl: 'Co zmniejsza dolegliwości?',
    options: [
      { label_pl: 'Odpoczynek', value: 'zmniejsza odpoczynek' },
      { label_pl: 'Ruch / rozgrzewka', value: 'zmniejsza ruch rozgrzewka' },
      { label_pl: 'Nic nie pomaga', value: 'nic nie pomaga bol caly czas' },
    ],
  });
  qs.push({
    id: 'radiation', question_pl: 'Czy ból promieniuje do kończyny?',
    options: [
      { label_pl: 'Tak', value: 'promieniuje do konczyny' },
      { label_pl: 'Nie', value: 'nie promieniuje' },
    ],
  });
  qs.push({
    id: 'neuro', question_pl: 'Czy występuje drętwienie lub mrowienie?',
    options: [
      { label_pl: 'Tak', value: 'wystepuje dretwienie i mrowienie' },
      { label_pl: 'Nie', value: 'bez dretwienia' },
    ],
  });
  qs.push({
    id: 'trauma', question_pl: 'Czy był uraz?',
    options: [
      { label_pl: 'Tak, świeży uraz', value: 'byl swiezy uraz' },
      { label_pl: 'Nie', value: 'bez urazu' },
    ],
  });
  qs.push({
    id: 'redflag', question_pl: 'Czy występuje któryś z objawów: gorączka, nocny ból budzący ze snu, problem z kontrolą pęcherza?',
    options: [
      { label_pl: 'Tak', value: 'goraczka nocny bol nietrzymanie' },
      { label_pl: 'Nie', value: 'bez objawow alarmowych' },
    ],
  });
  qs.push({
    id: 'age', question_pl: 'Wiek (pomaga dobrać bezpieczeństwo)?',
    options: [
      { label_pl: 'Poniżej 40', value: '' },
      { label_pl: '40–64', value: '' },
      { label_pl: '65+', value: 'senior podeszly wiek' },
    ],
  });
  qs.push({
    id: 'activity', question_pl: 'Poziom aktywności?',
    options: [
      { label_pl: 'Niski / siedzący', value: 'siedzacy tryb zycia' },
      { label_pl: 'Umiarkowany', value: 'umiarkowana aktywnosc' },
      { label_pl: 'Wysoki / sport', value: 'wysoka aktywnosc sport' },
    ],
  });

  return qs;
}

/** Re-analyze the complaint enriched with the current answers + tapped region. */
export function analyzeInterview(state: InterviewState): AnalysisResult {
  const regionHint =
    state.region ? (REGION_OPTIONS.find((o) => o.value === state.region)?.hint ?? '') : '';
  const answerHints = Object.values(state.answers).filter(Boolean);
  const text = [state.rawText, regionHint, ...answerHints].filter(Boolean).join('. ');
  return analyzeComplaint(text || 'ogólna sprawność');
}

/**
 * Returns the NEXT question to ask, or null when the interview is complete.
 * Stops early once confidence is high and the safety screen has been asked, or
 * after MAX_QUESTIONS.
 */
export function nextQuestion(state: InterviewState): InterviewQuestion | null {
  if (Object.keys(state.answers).length >= MAX_QUESTIONS) return null;
  const analysis = analyzeInterview(state);
  const bank = questionBank(state, analysis);
  const asked = new Set(Object.keys(state.answers));
  const remaining = bank.filter((q) => !asked.has(q.id) && !(q.id === 'region' && state.region));

  // Always make sure the red-flag screen is asked before finishing.
  const askedRedflag = asked.has('redflag');
  if (analysis.confidence >= 0.8 && askedRedflag && asked.size >= 3) return null;

  return remaining[0] ?? null;
}

export function applyAnswer(state: InterviewState, questionId: string, value: string): InterviewState {
  if (questionId === 'region') {
    return { ...state, region: value as BodyRegion, answers: { ...state.answers, region: value } };
  }
  return { ...state, answers: { ...state.answers, [questionId]: value } };
}

export const INTERVIEW_MAX_QUESTIONS = MAX_QUESTIONS;
