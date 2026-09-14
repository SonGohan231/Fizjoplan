# Finezjo Automat - importer bazy ćwiczeń

Pakiet automatyzuje ręczne wprowadzanie szablonów ćwiczeń do widocznego formularza w aplikacji Finezjo.

## Co zawiera
- `finezjo_importer.py` - automat Playwright.
- `exercises.json` - 160 ćwiczeń w 32 kategoriach.
- `INSTALL.bat` - jednorazowa instalacja zależności.
- `START.bat` - uruchamianie programu.
- `INSTRUKCJA_Finezjo_Automat.pdf` - instrukcja krok po kroku w paczce ZIP.

## Bezpieczeństwo
- Program NIE zapisuje loginu ani hasła.
- Logowanie do Finezjo wykonujesz ręcznie.
- Sesja przeglądarki może pozostać lokalnie w folderze `browser_profile`.
- Domyślny bezpieczny tryb testowy dodaje tylko 1 ćwiczenie.
- Program sprawdza nazwę ćwiczenia w wyszukiwarce i pomija duplikaty.
- Przy błędzie zatrzymuje import, zapisuje `log.csv` i zrzut ekranu.
- Program działa przez interfejs użytkownika, a nie przez prywatne/nieudokumentowane API.

## Uruchomienie w Windows
1. Zainstaluj Python 3.11+ i zaznacz `Add Python to PATH`.
2. Dwukrotnie kliknij `INSTALL.bat`.
3. Po zakończeniu instalacji kliknij `START.bat`.
4. Wybierz `1 - TEST`.
5. Zaloguj się ręcznie do Finezjo.
6. Przejdź do `Ustawienia -> Szablony -> Ćwiczenia`.
7. Wróć do okna programu i naciśnij ENTER.
8. Sprawdź, czy testowe ćwiczenie zostało zapisane poprawnie.
9. Uruchom program ponownie i wybierz pełny import.

## Wznowienie
Jeżeli program zatrzyma się np. na ćwiczeniu nr 48, uruchom go ponownie i wybierz opcję importu od numeru 48.

## Uwaga
Finezjo może w przyszłości zmienić strukturę strony. Program ma kilka mechanizmów awaryjnego wyszukiwania pól, ale po większej zmianie interfejsu może wymagać aktualizacji selektorów.
