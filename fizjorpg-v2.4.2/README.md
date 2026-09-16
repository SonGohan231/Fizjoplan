# FizjoRPG v2.4.2 — BALANCE & LEARNING CORRECTNESS

Wersja naprawcza po audycie v2.4.1. Priorytet: poprawność ekonomii, pamięci i decyzji w walce przed dalszym zwiększaniem contentu.

## Najważniejsze zmiany
- loot rarity ma teraz prawdziwy model wag: bazowe Legendary ~0,5%; luck poprawia względnie jakość, nie dodaje punktów procentowych do Legendary;
- pity Legendary rośnie dopiero po dłuższej serii bez dropu i ma twardy limit;
- SRS działa na poziomie pojęcia (`conceptId`) i faktycznie osiąga 1/3/7/14/30/60 dni;
- warianty MCQ/active recall/językowe jednego pojęcia współdzielą mastery;
- Kodeks zapisuje pojęcia, a nie duplikaty pytań;
- Słownik odblokowuje wyłącznie jawnie powiązane `glossaryIds` — brak losowego fallbacku;
- adaptacja bierze pod uwagę typ pytania, active recall, recency, mastery i histerezę progów;
- Analiza ma realny koszt decyzji i cooldown utrzymujący się przez następną turę;
- faza 3 bossów łączy wcześniej poznane mechaniki zamiast wracać do ruchu z fazy 1;
- run RNG obejmuje loot, walkę, krytyki, wybory i zdarzenia, dzięki czemu seed jest powtarzalny;
- 30 reliktów, 12 klątw i 12 synergii runu;
- profesje mają limit LV20 i malejący przyrost premii;
- centralne capy zabezpieczają crit/KXP/rarity/healing/HP/DEF/Insight i inne bonusy przed power creepem;
- zestawy światów mają różne mechaniczne bonusy;
- poziom Łatwy jest dostępny w UI;
- osobne suwaki głośności muzyki i SFX;
- lekki `requestAnimationFrame` działa tylko podczas aktywnej animacji/FX, zamiast stałego renderowania;
- `boss_phase.wav` jest osobnym efektem, a muzyka proceduralna ma bardziej zróżnicowane frazy;
- migracja zapisów obejmuje v2, v2.3, v2.4 i v2.4.1.

## Testy
- `truth-test.py` — komplet handlerów bossów i krytyczne systemy;
- `deep-runs-test.py` — adaptacja, archetypy, synergie, głębokość;
- `hardening-test.mjs` — progi adaptacji, anti-repeat, deck archetypów, retencja historii;
- `runtime-smoke.mjs` — uruchomienie kluczowej pętli runtime;
- `balance-learning-test.mjs` — conceptId, 60-dniowy SRS, RNG, cooldown Analizy, capy i symulacja 100 000 loot rolli.

W referencyjnej symulacji testowej: Legendary ~0,526% bez lucku i ~0,809% przy maksymalnym legalnym lucku 0,25.

Pełny artefakt źródłowy i APK są archiwizowane równolegle na Google Drive; gałąź służy jako wersjonowany zapis zmian i testów.