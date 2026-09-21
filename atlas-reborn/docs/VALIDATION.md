# Stan wydania 1.0.0

## Logika gry - 13 testów zaliczonych

200 map z dostępnymi obiektami; 16 kompletnych wypraw (8 krain w obu trybach); trzy klasy; nagrody, przerwanie ataku, zapis i odrzucanie wadliwych danych.

## Interfejs - test zaliczony

Chromium: pełna pięciokomnatowa wyprawa z bossem, pytania i wyjaśnienia, rzeczywiste zdarzenia dotykowe joysticka, odblokowanie krainy, przeładowanie i zachowanie zapisu. Zrzuty 1000×600, 844×390 i 390×844; brak błędów JavaScript.

## APK - weryfikacja zaliczona

Nowa kompilacja, identyfikator pl.somaskan.atlasecharuchu, Android 8+ (API 26), podpis APK v2/v3, poprawne wyrównanie. Pliki gry w APK porównane z końcowymi źródłami.

## Android - instalacja i start potwierdzone

Emulator Android 15 / API 35: zainstalowano kompilację debug, a zrzut potwierdził prawidłowy ekran startowy w WebView. Podpis wersji do pobrania sprawdzono osobno. Fizyczny telefon, długie sesje i pobór baterii nie były testowane.

Przebiegi GitHub Actions: https://github.com/SonGohan231/Fizjoplan/actions/workflows/atlas-reborn.yml

APK SHA-256: `f5649af3e7ef81d4d9aaff64216281afd3f244892ced6f0df77c2fd327cd3521`

Ograniczenie testu Android UIAutomator: WebView nie udostępnił drzewa HTML; obrazy oceniono wizualnie. Test przeglądarkowy korzystał z prawdziwych wejść, bez modyfikowania stanu gry.
