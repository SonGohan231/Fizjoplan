import type { AnalysisResult, BodyRegion, ClarifyingQuestion, RedFlagHit } from '../types';
import {
  REGION_RULES,
  CONDITION_RULES,
  RED_FLAG_RULES,
  CONTRAINDICATION_RULES,
  CAUTION_RULES,
} from './knowledgeBase';
import { CAUTIOUS_CONDITIONS, HALT_CATEGORIES } from './vocabulary';

// ---------------------------------------------------------------------------
// Rule-based symptom analyzer.
//
// Contract: analyzeComplaint(text) -> AnalysisResult.
// A future LLM analyzer should implement the SAME signature and return the SAME
// shape (with source: 'llm'), so nothing downstream changes. See analyzeAsync().
// ---------------------------------------------------------------------------

/** Lowercase + strip Polish diacritics for robust keyword matching. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining marks
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countKeywordHits(haystack: string, keywords: string[]): number {
  let hits = 0;
  for (const kw of keywords) {
    const norm = normalize(kw);
    if (norm && haystack.includes(norm)) hits += 1;
  }
  return hits;
}

export function analyzeComplaint(rawText: string): AnalysisResult {
  const text = ' ' + normalize(rawText) + ' ';

  // --- regions (ranked by hit count) -------------------------------------
  const regionScores = new Map<BodyRegion, number>();
  for (const rule of REGION_RULES) {
    const hits = countKeywordHits(text, rule.keywords);
    if (hits > 0) regionScores.set(rule.region, (regionScores.get(rule.region) ?? 0) + hits);
  }

  // --- conditions --------------------------------------------------------
  const conditionTags = new Set<string>();
  const goalTags = new Set<string>();
  for (const rule of CONDITION_RULES) {
    const hits = countKeywordHits(text, rule.keywords);
    if (hits > 0) {
      conditionTags.add(rule.condition);
      rule.goalTags.forEach((g) => goalTags.add(g));
      // A condition that names a region reinforces that region.
      if (rule.region) regionScores.set(rule.region, (regionScores.get(rule.region) ?? 0) + 2);
    }
  }

  // --- contraindication flags -------------------------------------------
  const contraindicationFlags = new Set<string>();
  for (const rule of CONTRAINDICATION_RULES) {
    if (countKeywordHits(text, rule.keywords) > 0) contraindicationFlags.add(rule.flag);
  }

  // --- safety categories -------------------------------------------------
  const safetyCategories = new Set<string>();
  for (const rule of CAUTION_RULES) {
    if (countKeywordHits(text, rule.keywords) > 0) safetyCategories.add(rule.category);
  }
  // Cautious conditions (radicular/nerve) imply a neurological cautious mode.
  for (const c of conditionTags) {
    if (CAUTIOUS_CONDITIONS.includes(c)) safetyCategories.add('neurological_symptoms');
  }

  // --- red flags ---------------------------------------------------------
  const redFlags: RedFlagHit[] = [];
  for (const rule of RED_FLAG_RULES) {
    if (countKeywordHits(text, rule.keywords) > 0) {
      redFlags.push({ code: rule.code, message_pl: rule.message_pl });
    }
  }
  if (redFlags.length > 0) safetyCategories.add('red_flag');

  const regions = [...regionScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([r]) => r);

  // If nothing matched, fall back to a 'general' wellbeing track.
  if (regions.length === 0) regions.push('general');
  if (goalTags.size === 0) {
    goalTags.add('mobility');
    goalTags.add('pain_relief');
  }

  // Confidence: did we identify a region AND a condition?
  const recognisedRegion = regions[0] !== 'general';
  const recognisedCondition = conditionTags.size > 0;
  let confidence = 0.2;
  if (recognisedRegion) confidence += 0.4;
  if (recognisedCondition) confidence += 0.4;
  confidence = Math.min(confidence, 1);

  return {
    rawText,
    regions,
    conditionTags: [...conditionTags],
    goalTags: [...goalTags],
    contraindicationFlags: [...contraindicationFlags],
    safetyCategories: [...safetyCategories],
    redFlags,
    confidence,
    source: 'rule-based',
  };
}

// ---------------------------------------------------------------------------
// Clarifying questions. When confidence is low we ask up to 3 simple questions
// to disambiguate region / nature / phase before generating a plan. Each answer
// value is appended to the complaint and the text is re-analyzed.
// ---------------------------------------------------------------------------

export const LOW_CONFIDENCE_THRESHOLD = 0.5;

export function needsClarification(analysis: AnalysisResult): boolean {
  // Never interrupt a red-flag/halt situation with questionnaires.
  if (analysis.redFlags.length > 0) return false;
  if (analysis.safetyCategories.some((c) => HALT_CATEGORIES.includes(c as any))) return false;
  return analysis.confidence < LOW_CONFIDENCE_THRESHOLD;
}

export function getClarifyingQuestions(analysis: AnalysisResult): ClarifyingQuestion[] {
  const questions: ClarifyingQuestion[] = [];

  // Q1: region — only if we couldn't identify one.
  if (analysis.regions[0] === 'general') {
    questions.push({
      id: 'region',
      question_pl: 'Której okolicy ciała dotyczy problem?',
      options: [
        { label_pl: 'Szyja / kark', value: 'ból szyi' },
        { label_pl: 'Bark / ramię', value: 'ból barku' },
        { label_pl: 'Łokieć / nadgarstek', value: 'ból łokcia nadgarstka' },
        { label_pl: 'Plecy (dolny odcinek)', value: 'ból dolnego odcinka pleców' },
        { label_pl: 'Biodro', value: 'ból biodra' },
        { label_pl: 'Kolano', value: 'ból kolana' },
        { label_pl: 'Kostka / stopa', value: 'ból kostki stopy' },
      ],
    });
  }

  // Q2: nature/trigger of the pain.
  questions.push({
    id: 'nature',
    question_pl: 'Co najbardziej nasila dolegliwości?',
    options: [
      { label_pl: 'Bezruch / długie siedzenie', value: 'nasila sie po siedzeniu praca biurowa' },
      { label_pl: 'Ruch i obciążenie', value: 'nasila sie przy ruchu i obciazeniu przeciazenie' },
      { label_pl: 'Konkretny uraz', value: 'po urazie skrecenie' },
      { label_pl: 'Nie wiem', value: '' },
    ],
  });

  // Q3: neurological screen / phase.
  questions.push({
    id: 'neuro',
    question_pl: 'Czy występuje drętwienie, mrowienie lub promieniowanie bólu do kończyny?',
    options: [
      { label_pl: 'Tak', value: 'wystepuje dretwienie i mrowienie promieniuje do konczyny' },
      { label_pl: 'Nie', value: 'bez dretwienia i mrowienia' },
    ],
  });

  return questions.slice(0, 3);
}

/** Merge clarifying answers into the original complaint and re-analyze. */
export function refineWithAnswers(rawText: string, answerValues: string[]): AnalysisResult {
  const extra = answerValues.filter(Boolean).join('. ');
  return analyzeComplaint([rawText, extra].filter(Boolean).join('. '));
}

/**
 * Async wrapper. Today it just calls the rule-based analyzer. Later, swap the
 * body for a Claude/OpenAI call that returns the same AnalysisResult shape;
 * callers (screens) already await this, so no UI change is needed.
 */
export async function analyzeAsync(rawText: string): Promise<AnalysisResult> {
  // TODO(ai): if AI enabled -> await analyzeWithLLM(rawText)
  return analyzeComplaint(rawText);
}
