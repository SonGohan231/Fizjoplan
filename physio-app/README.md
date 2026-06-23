# FizjoPlan — Exercise Intelligence Platform

An intelligent **Polish physiotherapy exercise database + rehabilitation plan generator** for Android.

A user describes a problem in natural language (e.g. *„ból biodra przy siedzeniu”*, *„łokieć tenisisty”*, *„ból kolana po rekonstrukcji ACL”*, *„ból dolnego odcinka pleców po pracy biurowej”*). The app analyzes the complaint, infers the likely **body region**, **problem category**, **contraindications**, and **red flags**, then generates a **safe, level-appropriate exercise plan** from an internal database and can export it to **PDF**.

> ⚠️ This is **not** a diagnostic tool. All output uses cautious language (*„możliwy problem”*, *„propozycja ćwiczeń”*, *„skonsultuj się z fizjoterapeutą/lekarzem”*) and surfaces red-flag warnings that recommend medical review before exercising.

---

## Tech stack

- **Expo / React Native** (Android) + **TypeScript**
- **Supabase** (Postgres) for the exercise database, with a built-in **local fallback** so the app runs fully offline using bundled sample data
- **React Navigation** (native-stack)
- **expo-print** + **expo-sharing** for PDF export
- Rule-based analyzer today; **AI-ready** — the analyzer hides behind a single `AnalysisResult` contract so a Claude/OpenAI call can replace the rules with zero downstream changes.

---

## Architecture

```
src/
  types/index.ts          Core types + the AnalysisResult contract (the seam
                          shared by the rule-based AND future LLM analyzer)
  engine/
    vocabulary.ts         Canonical tag sets + SAFETY_CATEGORIES / HALT rules
    knowledgeBase.ts      Region/condition/red-flag/contraindication keyword maps
    analyzer.ts           normalize() + analyzeComplaint() -> AnalysisResult;
                          needsClarification(); analyzeAsync() = LLM swap point
    matcher.ts            Safety filter + relevance filter + scoring/ranking
    planGenerator.ts      Builds the RehabPlan; HALT -> buildSafetyPlan()
    clinicalInterview.ts  Dynamic <=10-question interview -> refined analysis
    autoTagger.ts         Rule-based tag inference w/ per-tag confidence
    taggingRules.ts       Bilingual (EN+PL) keyword rules for the tagger
    translation.ts        EN->PL pipeline (provider iface + glossary + LLM stub)
    search.ts             Fuzzy/synonym/inflection-tolerant search engine
    quality.ts            quality_score (completeness/translation/tags/media)
  data/
    exercises.ts          CORE + EXTENDED = 65 sample exercises
    exercisesExtended.ts  54 extra exercises via mk() builder
    glossary.ts           ~108-term EN->PL physio glossary
    synonyms.ts           Search synonyms/abbreviations (GTPS, ACL, rwa kulszowa)
  services/
    exerciseService.ts    Supabase reads/writes + local fallback + runtime store
    exerciseRepository.ts Scale layer: pagination, in-memory index, TTL cache
    importService.ts      JSON/CSV parsing + field validation
    importStudio.ts       Validate -> dedup -> merge -> suspicious -> batch ops
    pdfExport.ts          Clinician + patient HTML -> PDF -> share sheet
  lib/supabase.ts         Client (app.json `extra`), null when unset
  navigation/             Typed native-stack navigator (12 screens)
  screens/                Home/Describe/SelectLevel/Plan/ExerciseDetail (core flow)
    BodyMapScreen         Front/back tappable region map -> analyzer
    ClinicalInterviewScreen  Dynamic question flow
    LibraryScreen         Advanced search + filters + lazy pagination
    StatsScreen           Totals, per-region bars, quality breakdown
    ImportStudioScreen    Paste/validate/preview/batch/import
    admin/                List + add/edit/delete + seed + Import Studio entry
  components/ui.tsx        Buttons, cards, badges, section titles
  i18n/pl.ts              All Polish UI strings
  theme/index.ts          Color / spacing / typography tokens
content/                  Sample import files (json, csv, english source)
scripts/generate_seed.js  Regenerates supabase/seed.sql from the data
supabase/
  schema.sql              Table, GIN indexes, updated_at trigger, RLS
  seed.sql                65 rows (auto-generated, deterministic UUIDs)
  migrations/0002_scale_and_quality.sql  pg_trgm + indexes + quality + search RPC
```

### Engine pipeline

```
complaint text
  → normalize()        lowercase + strip Polish diacritics (ł→l, ę→e, …)
  → analyzeComplaint() → AnalysisResult { regions, conditionTags, goalTags,
                          contraindicationFlags, redFlags, confidence, source }
  → matchExercises()   safety filter → relevance filter → score → rank
  → generatePlan()     RehabPlan with Polish summary, dosing, warnings, disclaimer
```

Two safeguards keep plans clinically sane:
- **Safety filter** (`isExerciseSafe`) hard-excludes any exercise whose `contraindications` / `red_flags` intersect the detected flags.
- **Relevance filter** (`isRelevant`) keeps an exercise only if it targets a detected region, is a `general` whole-body exercise, or shares a specific condition tag — preventing goal-only cross-region bleed (e.g. a back exercise leaking into a tennis-elbow plan via a shared `pain_relief` goal).

---

## Exercise Intelligence Platform

Everything above the database is built to ingest, normalise, and serve **10k–100k+** exercises. Each capability hides behind a contract so a rule-based body can later be replaced by an LLM/API without touching callers.

```
                         ┌────────────────────────── UI (React Native / Expo) ──────────────────────────┐
   Home ─┬─ Describe ───────────────► analyzer.analyzeAsync ─┐
         ├─ BodyMap ─► Interview ──► clinicalInterview ──────┤ needsClarification?
         │                                                   ▼
         ├─ Library  ─► search + repository.queryExercises   SelectLevel ─► Plan ─► ExerciseDetail
         ├─ Stats    ─► repository.countByRegion + quality                   │
         └─ Admin ─► ImportStudio                                            └─► pdfExport (clinician + patient)
                         └───────────────────────────────────────────────────────────────────────────────┘
                                                   │
            ┌──────────────────────────────────────┼───────────────────────────────────────┐
            ▼                                       ▼                                       ▼
   ENGINE (pure, testable)                 SERVICES (orchestration)                 DATA / CONTRACTS
   ─────────────────────────               ─────────────────────────               ──────────────────
   analyzer ─ matcher ─ planGenerator      importStudio                            types/index.ts
   autoTagger ─ taggingRules               ├─ importService (parse+validate)       vocabulary / knowledgeBase
   translation ─ glossary                  │                                       data/exercises (65)
   search ─ synonyms                       ├─ autoTag · translate · merge (batch)  glossary · synonyms
   quality                                 exerciseRepository ─ index+cache+page
   clinicalInterview                       exerciseService ─ runtime store
                                                   │
                                                   ▼
                                          Supabase / Postgres (optional)
                                          schema.sql + migrations/0002
                                          pg_trgm fuzzy · GIN tags · range pagination
                                          search_exercises() RPC · quality columns
                                                   │
                                          (absent ⇒ local SAMPLE_EXERCISES + runtime imports)
```

### Import Studio (`importStudio.ts` + `ImportStudioScreen`)
Paste **JSON** or **CSV** (array fields use `|`). The pipeline runs `validate → detect duplicates → flag suspicious → quality-score`, then offers one-tap **batch auto-tag**, **batch translate**, and **merge duplicates** before import. Validation requires `title_pl, description_pl, body_region (valid), condition_tags, goal_tags, difficulty_level (1–3)` and returns a report of **valid / invalid (with per-field messages) / duplicate / suspicious** records plus a quality histogram. Imported rows land in the in-memory runtime store immediately (and upsert to Supabase when configured).

### Translation pipeline (`translation.ts`)
`TranslationProvider` interface with an offline **glossary provider** (longest-match EN→PL substitution over ~108 physio terms) and an **LLM provider stub** that implements the same contract. Translates title / instructions / progression / regression / precautions, returns a **0–1 quality score** + label (`excellent / good / needs_review`), and supports `translateBatch`. The glossary preserves clinical terminology; it is *not* fluent machine translation, so partially-covered text is correctly flagged for human review.

### Auto-tagging (`autoTagger.ts`)
Infers `body_region, condition_tags, tissue_tags, goal_tags, equipment, position, difficulty_level` from EN/PL text (title weighted 2×), each with a **confidence score**. `enrichWithTags()` fills *only missing* fields, never overwriting curated values. *(“Side lying hip abduction” → hip · strength · mat · gluteal_tendinopathy · side_lying.)*

### Clinical interview (`clinicalInterview.ts` + `ClinicalInterviewScreen`)
Dynamic, conditional question flow (region, onset, aggravating, easing, radiation, neuro, trauma, red-flag screen, age, activity), **≤10 questions**, stopping early once confidence is high and the red-flag screen is done. Answers fold back into `analyzeComplaint()` for a higher-confidence `AnalysisResult`.

### Body map (`BodyMapScreen`)
Dependency-free front/back tappable region grid (no SVG dependency). A tapped region seeds the interview/analyzer.

### Scalable repository (`exerciseRepository.ts`)
Server-side filter + **range pagination** via Supabase (`.eq/.contains/.range`) so the device never loads the whole table; offline it uses **in-memory indices** (by region / condition) + a **30 s TTL cache** + the fuzzy search engine. `queryExercises(filters, page, pageSize) → { items, total, hasMore }`, plus `countByRegion()` / `totalCount()`.

### Advanced search (`search.ts` + `synonyms.ts`)
Tolerant of **typos** (Levenshtein + trigram), **Polish inflections** (light stemmer), and **synonyms/abbreviations** (GTPS, ACL, rwa kulszowa, rotator cuff…). Ranks across title, tags, region, and condition. Server-side equivalent ships as the `search_exercises()` pg_trgm RPC in migration 0002.

### Quality system (`quality.ts`)
`quality_score = completeness·0.4 + translation·0.2 + tagConfidence·0.25 + media·0.15` → status `excellent / good / needs_review`, with the list of missing fields. Surfaced in the Stats screen and Import Studio, and persistable via the `quality_score` / `quality_status` columns in migration 0002.


---

## Setup

The project ships as **source only** (no `node_modules`). Because Expo SDK versions must line up with the installed Expo CLI, the cleanest path is to let Expo resolve the dependency versions for you.

### 1. Install dependencies

```bash
cd physio-app
npx expo install   # aligns RN/Expo package versions to the installed SDK
# or, if you prefer to pin exactly what's in package.json:
npm install
```

> If you hit SDK-version mismatches, scaffold a fresh app with
> `npx create-expo-app@latest` on the SDK you want, then copy `src/`, `App.tsx`,
> and the config files over and re-run `npx expo install`.

### 2. (Optional) Configure Supabase

The app runs **without** Supabase using bundled sample data. To use a real database:

1. Create a Supabase project.
2. In the SQL editor, run **`supabase/schema.sql`**, then **`supabase/seed.sql`**.
3. Add your keys to `app.json` under `expo.extra`:

```json
"extra": {
  "supabaseUrl": "https://YOUR-PROJECT.supabase.co",
  "supabaseAnonKey": "YOUR-ANON-KEY"
}
```

(You can also copy `.env.example` → `.env` for your own tooling; the app reads keys from `app.json` `extra` at runtime.)

When keys are absent, `isSupabaseConfigured` is `false` and every read falls back to the local `SAMPLE_EXERCISES`, so the full flow still works.

### 3. Run

```bash
npx expo start          # then press "a" for Android, or scan the QR in Expo Go
```

### UI flow

`Home → Opisz problem → (Wywiad kliniczny jeśli niejasne) → Wybierz poziom → Plan → Szczegóły → Eksport PDF`

Additional entry points from Home: **Mapa ciała** (tap a region → interview), **Biblioteka ćwiczeń** (advanced search + filters + pagination), **Statystyki bazy** (totals + quality), and the **admin panel** (add / edit / delete, seed Supabase, and **Studio importu**). The Plan screen exports both a **clinician PDF** and a simpler **patient PDF**, and shows a *Plan bezpieczeństwa* badge when a red-flag/halt condition forces the gentle safety plan.

---

## Adding exercises

Each exercise follows the `Exercise` type in `src/types/index.ts`:

`id, title_pl, title_en, description_pl, description_en, body_region, condition_tags, tissue_tags, goal_tags, difficulty_level, equipment, position, contraindications, red_flags, sets, reps, duration, frequency, progression, regression, image_url, video_url, source_url, license_note`

Tag vocabularies live in `src/engine/vocabulary.ts`. Keep `condition_tags` aligned with the conditions in `knowledgeBase.ts` so matching stays tight. The schema uses Postgres arrays + GIN indexes; **migration `0002`** adds `pg_trgm` fuzzy indexes, a `search_exercises()` RPC, composite pagination indexes, and quality columns, so it scales to 100k+ rows.

For bulk content, use the **Import Studio** (admin → *Studio importu*): paste JSON/CSV, review the validation report, batch auto-tag / translate / merge, then import. Sample files live in `content/`. After changing `src/data/exercises.ts`, regenerate the seed with `node scripts/generate_seed.js > supabase/seed.sql`.

---

## Testing

The engine + services have a transpile-and-run harness (no RN needed). It covers all 12 required clinical cases (hip-pain-sitting, low-back desk, tennis/golfer elbow, shoulder impingement, rotator cuff, ACL rehab without false halt, ankle sprain, gluteal tendinopathy, senior balance, sciatica + neuro, cervical) plus red-flag halt, auto-tagging, translation, fuzzy search (GTPS/ACL/rwa/typos/inflection), quality, the import studio (validate/dedup/merge/CSV/batch), interview convergence, and repository pagination/counts — **74 assertions**. See the delivery report for how to run it.

---

## Swapping in an LLM analyzer (later)

The whole app depends only on the **`AnalysisResult`** shape, never on *how* it was produced. `AnalysisResult.source` is already `'rule-based' | 'llm'`.

To go AI-powered, replace the body of **`analyzeAsync()`** in `src/engine/analyzer.ts` with a Claude/OpenAI call that returns the same structured object (regions, condition tags, goal tags, contraindication flags, red flags, confidence). Everything downstream — matcher, plan generator, screens, PDF — keeps working unchanged. Keep the rule-based `analyzeComplaint()` as an offline fallback and for red-flag detection redundancy.

---

## Safety notes

- Plans always include **stop-warning signs** and a **disclaimer** recommending professional consultation.
- Detected **red flags** (bilateral neuro symptoms, bladder/bowel changes, night pain + fever, recent trauma, chest/systemic symptoms) trigger a prominent warning and soften the plan.
- The analyzer is intentionally conservative: low-confidence complaints fall back to gentle general-mobility suggestions rather than guessing a region.
