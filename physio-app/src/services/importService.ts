import type { Exercise, ExerciseInput, BodyRegion } from '../types';

// ---------------------------------------------------------------------------
// Content import. Parses + validates exercises from JSON or CSV before they are
// allowed into the database. Every record is validated; invalid records are
// reported with clear, field-level Polish error messages and are NOT imported.
// ---------------------------------------------------------------------------

const VALID_REGIONS: BodyRegion[] = [
  'neck', 'shoulder', 'elbow', 'wrist_hand', 'thoracic',
  'lower_back', 'hip', 'knee', 'ankle_foot', 'general',
];

// Columns treated as string[] in CSV (pipe-separated: a|b|c).
const ARRAY_FIELDS = [
  'condition_tags', 'tissue_tags', 'goal_tags', 'equipment', 'contraindications', 'red_flags',
] as const;

const NUMERIC_FIELDS = ['difficulty_level', 'sets', 'reps', 'duration_seconds', 'frequency_per_week'] as const;

export interface ImportError {
  row: number; // 1-based index within the file
  title?: string;
  messages: string[];
}

export interface ImportParseResult {
  valid: ExerciseInput[];
  errors: ImportError[];
  totalRows: number;
}

// --- Validation ------------------------------------------------------------

const REQUIRED_TEXT = ['title_pl', 'description_pl'] as const;
const REQUIRED_ARRAY = ['condition_tags', 'goal_tags'] as const;

export function validateRecord(raw: any, row: number): { ok: true; value: ExerciseInput } | { ok: false; error: ImportError } {
  const messages: string[] = [];
  const rec = raw ?? {};

  for (const f of REQUIRED_TEXT) {
    if (typeof rec[f] !== 'string' || !rec[f].trim()) messages.push(`Brak wymaganego pola tekstowego: ${f}.`);
  }
  if (typeof rec.body_region !== 'string' || !rec.body_region.trim()) {
    messages.push('Brak wymaganego pola: body_region.');
  } else if (!VALID_REGIONS.includes(rec.body_region)) {
    messages.push(`Nieznany body_region: "${rec.body_region}". Dozwolone: ${VALID_REGIONS.join(', ')}.`);
  }
  for (const f of REQUIRED_ARRAY) {
    if (!Array.isArray(rec[f]) || rec[f].length === 0) messages.push(`Pole ${f} musi być niepustą listą.`);
  }
  const diff = rec.difficulty_level;
  if (diff === undefined || diff === null || diff === '') {
    messages.push('Brak wymaganego pola: difficulty_level.');
  } else if (![1, 2, 3].includes(Number(diff))) {
    messages.push('difficulty_level musi wynosić 1, 2 lub 3.');
  }

  if (messages.length > 0) {
    return { ok: false, error: { row, title: typeof rec.title_pl === 'string' ? rec.title_pl : undefined, messages } };
  }

  // Normalise into a clean ExerciseInput with safe defaults.
  const value: ExerciseInput = {
    id: typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : undefined,
    title_pl: String(rec.title_pl).trim(),
    title_en: rec.title_en ? String(rec.title_en) : null,
    description_pl: String(rec.description_pl).trim(),
    description_en: rec.description_en ? String(rec.description_en) : null,
    body_region: rec.body_region,
    condition_tags: asArray(rec.condition_tags),
    tissue_tags: asArray(rec.tissue_tags),
    goal_tags: asArray(rec.goal_tags),
    difficulty_level: Number(diff),
    equipment: asArray(rec.equipment),
    position: rec.position ? String(rec.position) : null,
    contraindications: asArray(rec.contraindications),
    red_flags: asArray(rec.red_flags),
    sets: numOrNull(rec.sets),
    reps: numOrNull(rec.reps),
    duration_seconds: numOrNull(rec.duration_seconds),
    frequency_per_week: numOrNull(rec.frequency_per_week),
    progression: rec.progression ? String(rec.progression) : null,
    regression: rec.regression ? String(rec.regression) : null,
    image_url: rec.image_url ? String(rec.image_url) : null,
    video_url: rec.video_url ? String(rec.video_url) : null,
    source_url: rec.source_url ? String(rec.source_url) : null,
    license_note: rec.license_note ? String(rec.license_note) : null,
  };
  return { ok: true, value };
}

function asArray(v: any): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim()) return v.split('|').map((s) => s.trim()).filter(Boolean);
  return [];
}

function numOrNull(v: any): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// --- JSON ------------------------------------------------------------------

export function parseJson(text: string): ImportParseResult {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e: any) {
    return { valid: [], errors: [{ row: 0, messages: [`Niepoprawny JSON: ${e?.message ?? 'błąd parsowania'}.`] }], totalRows: 0 };
  }
  const arr = Array.isArray(data) ? data : Array.isArray(data?.exercises) ? data.exercises : null;
  if (!arr) {
    return { valid: [], errors: [{ row: 0, messages: ['Oczekiwano tablicy ćwiczeń lub obiektu { "exercises": [...] }.'] }], totalRows: 0 };
  }
  return validateMany(arr);
}

// --- CSV -------------------------------------------------------------------

/** Minimal RFC-4180-ish CSV parser supporting quoted fields and escaped quotes. */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((x) => x.trim() !== '')) rows.push(row);
  }
  return rows;
}

export function parseCsv(text: string): ImportParseResult {
  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    return { valid: [], errors: [{ row: 0, messages: ['Plik CSV musi zawierać nagłówek i co najmniej jeden wiersz.'] }], totalRows: 0 };
  }
  const header = rows[0].map((h) => h.trim());
  const objects = rows.slice(1).map((cols) => {
    const obj: Record<string, any> = {};
    header.forEach((key, idx) => {
      const cell = cols[idx] ?? '';
      if ((ARRAY_FIELDS as readonly string[]).includes(key)) obj[key] = asArray(cell);
      else if ((NUMERIC_FIELDS as readonly string[]).includes(key)) obj[key] = cell === '' ? null : Number(cell);
      else obj[key] = cell;
    });
    return obj;
  });
  return validateMany(objects);
}

function validateMany(arr: any[]): ImportParseResult {
  const valid: ExerciseInput[] = [];
  const errors: ImportError[] = [];
  arr.forEach((rec, i) => {
    const res = validateRecord(rec, i + 1);
    if (res.ok) valid.push(res.value);
    else errors.push(res.error);
  });
  return { valid, errors, totalRows: arr.length };
}

export function parseContent(text: string, format: 'json' | 'csv'): ImportParseResult {
  return format === 'csv' ? parseCsv(text) : parseJson(text);
}
