/* FizjoPlan — database validation & QC.
 *
 * Compiles the typed dataset (TypeScript validation) and runs:
 *  - duplicate ids / titles / descriptions / exercise-logic
 *  - missing tags (condition/tissue/goal)
 *  - missing safety data (contraindications & red_flags fields)
 *  - invalid difficulty levels (must be 1..3)
 *  - per-region count verification
 * Duplicates are auto-removed (first occurrence kept) and reported.
 *
 * Run: node scripts/validate_db.js
 */
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = '/tmp/dbcheck/out';
fs.mkdirSync(OUT, { recursive: true });

console.log('• Compiling typed dataset (TypeScript validation)…');
try {
  execSync(
    `npx tsc src/types/index.ts src/data/exercises.ts src/data/exercisesExtended.ts src/data/exercisesGenerated.ts ` +
      `--outDir ${OUT} --module commonjs --target es2019 --skipLibCheck --esModuleInterop --ignoreConfig`,
    { cwd: ROOT, stdio: 'pipe' },
  );
  console.log('  ✓ TypeScript compiled with 0 errors');
} catch (e) {
  console.error('  ✗ TypeScript compilation FAILED:\n', e.stdout ? e.stdout.toString() : e.message);
  process.exit(1);
}

const { SAMPLE_EXERCISES } = require(path.join(OUT, 'data/exercises.js'));
console.log(`• Loaded ${SAMPLE_EXERCISES.length} exercises\n`);

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const logicSig = (e) =>
  [e.body_region, [...e.condition_tags].sort().join('+'), e.position, e.difficulty_level, norm(e.description_pl)].join('|');

const issues = { dupId: [], dupTitlePl: [], dupTitleEn: [], dupDescPl: [], dupLogic: [], missingTags: [], missingSafety: [], badDifficulty: [] };
const seenId = new Set(), seenTitlePl = new Set(), seenTitleEn = new Set(), seenDescPl = new Set(), seenLogic = new Set();
const kept = [];

for (const e of SAMPLE_EXERCISES) {
  let dup = false;
  if (seenId.has(e.id)) { issues.dupId.push(e.id); dup = true; }
  if (seenTitlePl.has(norm(e.title_pl))) { issues.dupTitlePl.push(e.title_pl); dup = true; }
  if (e.title_en && seenTitleEn.has(norm(e.title_en))) { issues.dupTitleEn.push(e.title_en); dup = true; }
  if (seenDescPl.has(norm(e.description_pl))) { issues.dupDescPl.push(e.id); dup = true; }
  if (seenLogic.has(logicSig(e))) { issues.dupLogic.push(e.id); dup = true; }

  // quality checks (reported regardless of dup)
  if (!e.condition_tags?.length || !e.tissue_tags?.length || !e.goal_tags?.length) issues.missingTags.push(e.id);
  if (e.contraindications == null || e.red_flags == null) issues.missingSafety.push(e.id);
  if (![1, 2, 3].includes(e.difficulty_level)) issues.badDifficulty.push(e.id);

  if (dup) continue; // auto-remove duplicate
  seenId.add(e.id); seenTitlePl.add(norm(e.title_pl));
  if (e.title_en) seenTitleEn.add(norm(e.title_en));
  seenDescPl.add(norm(e.description_pl)); seenLogic.add(logicSig(e));
  kept.push(e);
}

const removed = SAMPLE_EXERCISES.length - kept.length;

// per-region counts
const byRegion = {};
for (const e of kept) byRegion[e.body_region] = (byRegion[e.body_region] || 0) + 1;

const line = (label, arr) => console.log(`  ${arr.length === 0 ? '✓' : '✗'} ${label}: ${arr.length}` + (arr.length ? ` → ${[...new Set(arr)].slice(0, 5).join(', ')}${arr.length > 5 ? '…' : ''}` : ''));
console.log('• Quality control');
line('duplicate ids', issues.dupId);
line('duplicate titles (PL)', issues.dupTitlePl);
line('duplicate titles (EN)', issues.dupTitleEn);
line('duplicate descriptions (PL)', issues.dupDescPl);
line('duplicate exercise logic', issues.dupLogic);
line('missing tags', issues.missingTags);
line('missing safety data', issues.missingSafety);
line('invalid difficulty levels', issues.badDifficulty);
console.log(`\n• Duplicates auto-removed: ${removed}`);
console.log(`• Final unique database size: ${kept.length}`);
console.log('• Per-region counts:', JSON.stringify(byRegion));

const fatal = issues.missingTags.length || issues.missingSafety.length || issues.badDifficulty.length;
if (fatal) { console.error('\n✗ VALIDATION FAILED (quality issues present).'); process.exit(1); }
console.log('\n✓ VALIDATION PASSED');
