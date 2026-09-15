# FizjoRPG: Atlas of Knowledge — vertical slice v1

Gra edukacyjna RPG/roguelike: 25% JRPG, 50% dungeon roguelike, 25% systemy długoterminowego RPG/MMO.

## Uruchomienie
Otwórz `index.html` w przeglądarce. Najlepiej przez prosty lokalny serwer (`python -m http.server 8080`) lub hosting HTTPS, aby działał Service Worker/PWA.

## Sterowanie
WASD / strzałki — ruch. E lub spacja — interakcja/pytanie. I — ekwipunek. K — drzewka. C — kodeks. Na telefonie działa sterowanie ekranowe.

## Nauka
- istniejąca biblioteka testów FizjoGabinet jest wczytywana z `data.js` i automatycznie zamieniana na pytania;
- osobne domeny: anatomia, fizjologia, psychologia, medycyna bez farmakologii, fizyka, natura, ciekawostki;
- Knowledge XP i osobne poziomy domen;
- słownik/kodeks odblokowywany postępem.

## Licencje inspiracji
Mechaniki projektu są inspirowane trzema wybranymi kierunkami, a implementacja tej paczki jest autorska. Nie skopiowano zewnętrznych assetów AI.


## v1.1 AUDIO
Muzyka proceduralna WebAudio zależna od świata. SFX Mirelo: cios, skrzynia, sekret, level-up i boss; proceduralny fallback pozostaje aktywny.

Treści kliniczne/medyczne są edukacyjne; gra nie służy do decyzji diagnostycznych ani terapeutycznych u konkretnego pacjenta.
