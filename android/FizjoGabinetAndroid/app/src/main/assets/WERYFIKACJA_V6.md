# FizjoGabinet PWA v6 — weryfikacja modułu ćwiczeń

- 4 etapy progresji.
- 32 kategorie w każdym etapie.
- 5 ćwiczeń w każdej kategorii.
- 160 ćwiczeń na etap.
- 640 wpisów łącznie.
- Każda kategoria: 2 pozycje inspirowane jogą + 3 ćwiczenia stopniowane.
- 4 osobne PDF-y, po 34 strony każdy: okładka, spis 32 kategorii, 32 strony kategorii.
- PDF-y wyrenderowano kontrolnie do PNG; reprezentatywne strony wszystkich czterech etapów sprawdzono pod kątem czytelności, ucięć i błędnych znaków.
- app.js, exercise-data.js i sw.js przeszły kontrolę składni Node.
- exercise_library.json sprawdzony programowo: 32 x 5 x 4.

Uwaga: 17 kategorii etapu pierwszego odzyskano bezpośrednio z wcześniejszego pliku „Baza ćwiczeń dla pacjentów - bez gum oporowych.pdf”. Pozostałe kategorie i kolejne etapy zostały uzupełnione tak, aby odtworzyć uzgodnioną strukturę 32 kategorii / 160 ćwiczeń na etap i pokryć obszary obecnej bazy klinicznej.
