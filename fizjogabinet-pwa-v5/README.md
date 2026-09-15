# FizjoGabinet PWA v5

Czytelna aplikacja gabinetowa dla fizjoterapeuty, przebudowana pod prostotę i szybkie użycie na komputerze oraz Androidzie.

## Zakres
- 33 protokoły kliniczne
- 68 opisanych testów
- 7 algorytmów badania różnicowego
- czerwone flagi
- ranking zgodności wzorców klinicznych
- terapia manualna, tejping, cele anatomiczne DN, ćwiczenia i zalecenia
- regionalne mapy SVG z warstwami: obszar objawów, tejping, cele DN, strefa ostrożności
- PWA: manifest, service worker, tryb offline po pierwszym załadowaniu, instalacja na Androidzie

## UX
Na komputerze aplikacja ma prostą nawigację boczną. Na telefonie stały dolny pasek: Start / Badanie / Protokoły / Testy. Badanie pokazuje jedno pytanie lub test na ekranie. Karta protokołu pokazuje jedną sekcję naraz.

## Bezpieczeństwo
Wynik algorytmu oznacza zgodność z wzorcem klinicznym, nie diagnozę ani statystyczne prawdopodobieństwo choroby. Mapy dry needling pokazują cele anatomiczne i strefy ostrożności, bez uniwersalnych głębokości lub kątów wkłucia.

## Wersja po audycie
Po kontroli poprawiono m.in. zbyt ogólne mapy, nadmiernie długą listę protokołów na telefonie, techniczny wynik punktowy oraz rozdzielenie informacji DN od stref ryzyka. Szczegóły: `KRYTYKA_I_POPRAWKI.md`.

Pełna poprawiona paczka PWA jest dystrybuowana jako `FizjoGabinet_PWA_v5_POPRAWIONA.zip` w rozmowie projektowej.