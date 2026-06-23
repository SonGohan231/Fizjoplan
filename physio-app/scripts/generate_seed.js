const crypto = require('crypto');
const { SAMPLE_EXERCISES } = require('./out/data/exercises');

// Deterministic UUID from a stable string id (namespaced md5 -> uuid shape).
function uuidFor(id) {
  const h = crypto.createHash('md5').update('fizjoplan:' + id).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}
const q = (s) => s === null || s === undefined ? 'null' : `'${String(s).replace(/'/g, "''")}'`;
const arr = (a) => `'{${(a||[]).map((x) => {
  const s = String(x);
  return /[",{}\s\\]/.test(s) ? '"' + s.replace(/(["\\])/g, '\\$1') + '"' : s;
}).join(',')}}'`;
const num = (n) => n === null || n === undefined ? 'null' : Number(n);

const cols = ['id','title_pl','title_en','description_pl','description_en','body_region',
  'condition_tags','tissue_tags','goal_tags','difficulty_level','equipment','position',
  'contraindications','red_flags','sets','reps','duration_seconds','frequency_per_week',
  'progression','regression','image_url','video_url','source_url','license_note'];

const rows = SAMPLE_EXERCISES.map((e) => {
  const v = [
    q(uuidFor(e.id)), q(e.title_pl), q(e.title_en), q(e.description_pl), q(e.description_en),
    q(e.body_region), arr(e.condition_tags), arr(e.tissue_tags), arr(e.goal_tags),
    num(e.difficulty_level), arr(e.equipment), q(e.position),
    arr(e.contraindications), arr(e.red_flags), num(e.sets), num(e.reps),
    num(e.duration_seconds), num(e.frequency_per_week), q(e.progression), q(e.regression),
    q(e.image_url), q(e.video_url), q(e.source_url), q(e.license_note || 'placeholder'),
  ];
  return '(' + v.join(', ') + ')';
});

const header = `-- ===========================================================================
-- Seed data — AUTO-GENERATED from src/data/exercises.ts (${SAMPLE_EXERCISES.length} exercises).
-- Regenerate with scripts/generate_seed.js. IDs are deterministic (stable re-runs).
-- Media URLs are placeholders; replace with licensed media before real use.
-- Safe to re-run: uses ON CONFLICT (id) DO UPDATE.
-- ===========================================================================

insert into public.exercises
  (${cols.join(', ')})
values
${rows.join(',\n')}
on conflict (id) do update set
  title_pl = excluded.title_pl,
  title_en = excluded.title_en,
  description_pl = excluded.description_pl,
  description_en = excluded.description_en,
  body_region = excluded.body_region,
  condition_tags = excluded.condition_tags,
  tissue_tags = excluded.tissue_tags,
  goal_tags = excluded.goal_tags,
  difficulty_level = excluded.difficulty_level,
  equipment = excluded.equipment,
  position = excluded.position,
  contraindications = excluded.contraindications,
  red_flags = excluded.red_flags,
  sets = excluded.sets,
  reps = excluded.reps,
  duration_seconds = excluded.duration_seconds,
  frequency_per_week = excluded.frequency_per_week,
  progression = excluded.progression,
  regression = excluded.regression,
  updated_at = now();
`;
process.stdout.write(header);
