import type { Exercise } from '../types';
import { normalize } from './analyzer';
import { SEARCH_SYNONYMS } from '../data/synonyms';

// ---------------------------------------------------------------------------
// Advanced search: symptom / condition / exercise text search that tolerates
// spelling mistakes, Polish inflections, and synonyms/abbreviations. Designed to
// run client-side over a page of results and/or back a server text index.
// ---------------------------------------------------------------------------

/** Light Polish stemmer: strip common inflectional endings to a stable root. */
export function stem(token: string): string {
  let t = token;
  if (t.length <= 4) return t;
  const suffixes = ['ami', 'ach', 'iem', 'om', 'ow', 'em', 'ie', 'y', 'i', 'a', 'e', 'u', 'ach', 'om'];
  for (const s of suffixes) {
    if (t.length - s.length >= 4 && t.endsWith(s)) { t = t.slice(0, -s.length); break; }
  }
  return t;
}

export function tokenize(text: string): string[] {
  return normalize(text).split(' ').filter((w) => w.length > 1);
}

/** Trigram set of a string for fuzzy similarity. */
function trigrams(s: string): Set<string> {
  const p = `  ${s} `;
  const out = new Set<string>();
  for (let i = 0; i < p.length - 2; i++) out.add(p.slice(i, i + 3));
  return out;
}

export function trigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = trigrams(a);
  const B = trigrams(b);
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

/** Levenshtein distance (capped use for short tokens). */
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
}

/** Fuzzy token equality tolerant of small typos and inflection. */
export function fuzzyTokenMatch(q: string, t: string): number {
  const qs = stem(q), ts = stem(t);
  if (qs === ts) return 1;
  if (ts.startsWith(qs) || qs.startsWith(ts)) return 0.9;
  const lev = levenshtein(qs, ts);
  if (lev <= 1) return 0.85;
  const tri = trigramSimilarity(qs, ts);
  return tri >= 0.5 ? 0.6 + (tri - 0.5) * 0.6 : 0;
}

/** Expand a raw query into canonical tokens via synonyms + stemming. */
export function expandQuery(query: string): { tokens: string[]; expansions: string[] } {
  const norm = normalize(query);
  const expansions = new Set<string>();
  for (const [key, vals] of Object.entries(SEARCH_SYNONYMS)) {
    if (norm.includes(normalize(key))) vals.forEach((v) => expansions.add(normalize(v)));
  }
  const tokens = tokenize(query).map(stem);
  return { tokens, expansions: [...expansions] };
}

export interface SearchHit {
  exercise: Exercise;
  score: number;
  matchedOn: string[];
}

function haystackTokens(ex: Exercise): { tokens: Set<string>; tags: Set<string> } {
  const text = [ex.title_pl, ex.title_en, ex.description_pl, ex.description_en, ex.position]
    .filter(Boolean).join(' ');
  const tokens = new Set(tokenize(text).map(stem));
  const tags = new Set(
    [ex.body_region, ...ex.condition_tags, ...ex.goal_tags, ...ex.tissue_tags, ...ex.equipment]
      .map((t) => normalize(String(t))),
  );
  return { tokens, tags };
}

export interface SearchOptions {
  limit?: number;
  minScore?: number;
}

/**
 * Search exercises by a free-text query (symptom, condition, abbreviation, or
 * exercise name). Returns ranked hits.
 */
export function searchExercises(query: string, exercises: Exercise[], opts: SearchOptions = {}): SearchHit[] {
  const { tokens, expansions } = expandQuery(query);
  if (tokens.length === 0 && expansions.length === 0) return [];
  const limit = opts.limit ?? 25;
  const minScore = opts.minScore ?? 0.5;

  const hits: SearchHit[] = [];
  for (const ex of exercises) {
    const { tokens: hTokens, tags } = haystackTokens(ex);
    let score = 0;
    const matchedOn: string[] = [];

    // Exact / synonym tag matches are the strongest signal.
    for (const exp of expansions) {
      if (tags.has(exp)) { score += 4; matchedOn.push(`tag:${exp}`); }
      else if ([...hTokens].some((t) => t === stem(exp))) { score += 2; matchedOn.push(`term:${exp}`); }
    }

    // Fuzzy token matching for free text.
    for (const qt of tokens) {
      let best = 0;
      if (tags.has(qt)) best = Math.max(best, 3);
      for (const ht of hTokens) {
        const m = fuzzyTokenMatch(qt, ht);
        if (m > best) best = m * 2;
      }
      if (best > 0) { score += best; matchedOn.push(`fuzzy:${qt}`); }
    }

    if (score >= minScore) hits.push({ exercise: ex, score: Number(score.toFixed(2)), matchedOn });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
