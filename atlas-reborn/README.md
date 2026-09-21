# Atlas — Echa Ruchu 1.0

Nowa samodzielna gra na Androida, inspirowana ustaleniami FizjoRPG. Nie importuje zapisów poprzedniej gry. Identyfikator aplikacji: `pl.somaskan.atlasecharuchu`.

## Zawartość

- Osiem krain o różnych układach i sekwencjach bossów; każda wyprawa ma pięć komnat.
- Trzy klasy, dwanaście reliktów zmieniających reguły walki, trwały rozwój dwóch cech.
- Eksploracja, skrytki, handlarz, wybór drogi, walka turowa z zapowiedzią zamiaru.
- 64 autorskie krótkie pojęcia i pytania, 8 sekwencji, odpowiedzi wyboru i przypominanie bez podpowiedzi.
- Osobne tryby przygody z nauką i bez obowiązkowych pytań.
- Zapis automatyczny z kopią awaryjną, eksport/import JSON, przechowywanie przerwanej walki.
- Nowe atlasy aktorów, otoczenia i animacji chodu; ambient Mirelo; autorski generowany w czasie gry motyw muzyczny.

## Uruchomienie źródeł

`npm ci`, następnie `npm start`. Wersja przeglądarkowa jest narzędziem rozwojowym; docelowy APK zawiera wszystkie pliki i działa offline.

## Testy

`npm test` sprawdza reguły, mapy, zapis i pełne wyprawy. `tests/browser-qa.mjs` sprawdza grę przez prawdziwy interfejs w Chromium i zapisuje zrzuty. Raport końcowy określa, które testy rzeczywiście wykonano. Testy logiki nie zastępują instalacji na telefonie.

## Android

Projekt Gradle: `android/`. Alternatywny powtarzalny build bez Gradle: `tools/build-android.sh` (JDK 17, Android platform 35, build-tools 35.0.1). Wymaga zmiennych `JAVA_HOME`, `ANDROID_HOME`, `ATLAS_KEYSTORE`, `ATLAS_PASSWORD_FILE`; opcjonalnie `ATLAS_KEY_ALIAS` (domyślnie `fizjorpg`). Skrypt nie tworzy ani nie wymienia klucza. Klucz i hasło nie należą do repozytorium ani paczki źródeł.

## Granice wydania

To pierwsze wydanie nowej gry, nie produkcja o skali komercyjnego MMORPG. RPG/MMO oznacza tutaj rozwój i ekwipunek; gra nie ma serwera, multiplayera, mikrotransakcji ani kont. Portrety bossów mają animację pozycji/reakcji, a bohater osobny 16-klatkowy arkusz chodu. Baza edukacyjna jest świadomie ograniczona; treści nie służą do kwalifikowania ani leczenia pacjentów. Fizyczny telefon i jego WebView wymagają osobnego sprawdzenia.

## Pochodzenie

Grafiki: wygenerowane dla tej gry dostępnym generatorem obrazów. Higgsfield odmówił żądania z powodu poziomu planu; nie przypisujemy mu tych grafik. Ambient: Mirelo, job `93ed2b470b8f466788209b6f271eefc0`. Phaser 3.90.0: MIT, licencja w `vendor/PHASER-LICENSE.txt`. Pytania są krótkimi autorskimi opracowaniami faktów; źródła odniesienia wskazano w `src/content.js`.

Android WebView wymaga uprawnienia INTERNET, aby nie blokował obrazów CSS pod lokalnym adresem HTTPS. Wszystkie żądania aplikacji są przechwytywane: własny host korzysta z plików APK, a pozostałe adresy są odrzucane. Gra działa bez połączenia.
