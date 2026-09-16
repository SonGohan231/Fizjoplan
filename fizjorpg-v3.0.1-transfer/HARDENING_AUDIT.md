# FizjoRPG v3.0.1 — hardening audit

Status 12 punktów z audytu:

1. **FIXED** — talent points z achievementu są przyznawane raz do świata ukończonego runu / wybranego świata, bez mnożenia przez liczbę odblokowanych światów.
2. **FIXED** — wszystkie obecnie odblokowywane tytuły mają jawne wpisy w `TITLE_EFFECTS` wraz z opisem efektu.
3. **FIXED** — `extraSecrets` jest agregowane jeden raz.
4. **FIXED** — weekly mastery używa `baselineMastery` ustawianego na początku tygodnia.
5. **FIXED** — „Pięć Dni Atlasu” wymaga pięciu różnych dat kalendarzowych.
6. **FIXED** — hint interakcji ma obsługę `npc` i nazwę „Handlarz Atlasu”.
7. **PARTIAL / DESIGN** — APEX-y mają 8 unikalnych ruchów, telegraph i możliwość przerwania Analizą; faza 3 nadal kumuluje ruchy bazowe + APEX, z capem mnożnika obrażeń 1.60. Długi playtest Ascension 3–5 nadal jest potrzebny.
8. **PARTIAL / DESIGN** — światy mają różne profile geometrii i mechaniki, ale nadal korzystają ze wspólnego generatora pokojowego.
9. **PARTIAL / ART** — rasterowe sprites/tiles są używane, ale arkusze nadal są małe i część obiektów/FX pozostaje proceduralna.
10. **OPEN / CONTENT** — nierównowaga liczby unikalnych pojęć/form między światami nie została jeszcze wyrównana pełnym content passem.
11. **FIXED / HARDENED** — walidator v3 sprawdza inventory, equipment, skillPoints/skillRanks, concepts, party, professions, gold/HP oraz strukturę aktywnego runu; nie jest jeszcze formalnym JSON Schema każdego zagnieżdżonego elementu.
12. **FIXED dla zgłoszonych regresji** — nowy test v3.0.1 obejmuje tytuły, save validation, Five Days i duplicate extraSecrets; pełny lokalny zestaw 14 testów regresji przeszedł.

## Testy

`truth-test`, `deep-runs-test`, `hardening-test`, `runtime-smoke`, `balance-learning-test`, `v25`, `v26`, `v27`, `v28`, `v29`, `v295`, `v30-endgame-runtime`, `v30-ui-integrity`, `v301-hardening` — **OK**.

## APK z tej sesji

- package w manifeście: `pl.fizjorpg.atlas.v301`
- etykieta: `FizjoRPG v3.0.1`
- native versionName: `3.0.1-v01`
- SHA-256 APK: `7aea88cd40b12fd29ab0161d689b60db1e882b1dd10cb8c8bd0582752e91f1da`
- assety APK pochodzą z rzeczywistego drzewa v3.0.1 (`src/v30.js`, `src/endgame-v29.js`, `assets-v30`, audio itd.)

Nie wykonano jeszcze instalacji na fizycznym Androidzie ani screenshotowego playtestu UI.