# -*- coding: utf-8 -*-
"""
Finezjo Exercise Importer
Automates adding exercise templates through the visible Finezjo web interface.
No password is stored by this program.
"""
from __future__ import annotations

import csv
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "exercises.json"
PROFILE_DIR = BASE_DIR / "browser_profile"
LOG_FILE = BASE_DIR / "log.csv"
SCREEN_DIR = BASE_DIR / "screenshots"
APP_URL = "https://app.finezjo.pl/"
TIMEOUT = 15000


def load_exercises() -> List[Dict[str, Any]]:
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def log_row(index: int, exercise: Dict[str, Any], status: str, details: str = "") -> None:
    new_file = not LOG_FILE.exists()
    with LOG_FILE.open("a", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        if new_file:
            w.writerow(["timestamp", "index", "name", "category", "status", "details"])
        w.writerow([
            datetime.now().isoformat(timespec="seconds"),
            index + 1,
            exercise.get("name", ""),
            exercise.get("category", ""),
            status,
            details,
        ])


def wait_for_user(page) -> None:
    print("\n=== LOGOWANIE I PRZEJŚCIE DO BAZY ĆWICZEŃ ===")
    print("1. Zaloguj się ręcznie w otwartym oknie Finezjo.")
    print("2. Wejdź do: Ustawienia -> Szablony -> Ćwiczenia.")
    print("3. Upewnij się, że widzisz nagłówek 'Baza ćwiczeń'.")
    input("\nGdy będziesz gotowy, wróć do tego okna i naciśnij ENTER...")
    try:
        page.get_by_text("Baza ćwiczeń", exact=True).wait_for(timeout=TIMEOUT)
    except PlaywrightTimeoutError:
        raise RuntimeError(
            "Nie widzę ekranu 'Baza ćwiczeń'. Otwórz w Finezjo Ustawienia -> Szablony -> Ćwiczenia i spróbuj ponownie."
        )


def find_input(page, name: str, label: str):
    loc = page.locator(f'input[name="{name}"]')
    if loc.count():
        return loc.first
    try:
        return page.get_by_label(label, exact=True).first
    except Exception:
        pass
    label_loc = page.get_by_text(label, exact=True).first
    return label_loc.locator("..").locator("input").first


def fill_textarea(page, text: str):
    loc = page.locator('textarea[name="Description"]')
    if loc.count():
        loc.first.fill(text)
        return
    try:
        page.get_by_label("Opis ćwiczenia", exact=True).fill(text)
        return
    except Exception:
        pass
    label = page.get_by_text("Opis ćwiczenia", exact=True).first
    label.locator("..").locator("textarea").first.fill(text)


def set_category(page, category: str):
    label = page.get_by_text("Kategorie", exact=True).first
    container = label.locator("..")
    inp = container.locator("input").first
    inp.click()
    inp.fill(category)
    page.wait_for_timeout(350)

    existing = page.get_by_text(category, exact=True)
    if existing.count():
        try:
            existing.last.click(timeout=2500)
            return
        except Exception:
            pass

    add_re = re.compile(r'Dodaj\s+["„”]?' + re.escape(category) + r'["„”]?', re.I)
    add = page.get_by_text(add_re)
    if add.count():
        add.last.click()
        return

    inp.press("Enter")


def search_duplicate(page, name: str) -> bool:
    search = page.locator('input[placeholder="Wyszukaj ćwiczenie"]')
    if not search.count():
        return False
    search = search.first
    search.fill(name)
    page.wait_for_timeout(500)
    try:
        found = page.get_by_text(name, exact=True).count() > 0
    finally:
        search.fill("")
        page.wait_for_timeout(250)
    return found


def add_one(page, exercise: Dict[str, Any], index: int, skip_existing: bool = True) -> str:
    if skip_existing and search_duplicate(page, exercise["name"]):
        log_row(index, exercise, "SKIPPED", "Ćwiczenie o tej nazwie już istnieje.")
        return "skipped"

    page.get_by_text("Dodaj ćwiczenie", exact=True).click()
    page.get_by_text("Dodaj szablon ćwiczenia", exact=True).wait_for(timeout=TIMEOUT)

    find_input(page, "Name", "Nazwa ćwiczenia").fill(exercise["name"])
    fill_textarea(page, exercise["description"])
    set_category(page, exercise["category"])
    find_input(page, "Repetitions", "Ilość powtórzeń").fill(str(exercise["repetitions"]))
    find_input(page, "Series", "Ilość serii").fill(str(exercise["series"]))
    find_input(page, "DailyReps", "Ile razy dziennie").fill(str(exercise["daily_reps"]))
    find_input(page, "Time", "Czas").fill(str(exercise["time_min"]))

    page.get_by_text("Zapisz", exact=True).last.click()
    page.get_by_text("Dodaj szablon ćwiczenia", exact=True).wait_for(state="hidden", timeout=TIMEOUT)
    page.get_by_text("Baza ćwiczeń", exact=True).wait_for(timeout=TIMEOUT)
    log_row(index, exercise, "OK", "")
    return "ok"


def save_error_screenshot(page, index: int, name: str) -> Path:
    SCREEN_DIR.mkdir(exist_ok=True)
    safe = re.sub(r'[^A-Za-z0-9_-]+', '_', name)[:60]
    path = SCREEN_DIR / f"error_{index+1:03d}_{safe}.png"
    page.screenshot(path=str(path), full_page=True)
    return path


def import_range(page, data, start: int, end: int, skip_existing: bool = True):
    ok = skipped = failed = 0
    total = end - start
    for pos, idx in enumerate(range(start, end), start=1):
        ex = data[idx]
        print(f"\n[{pos}/{total}] #{idx+1}: {ex['name']}")
        try:
            result = add_one(page, ex, idx, skip_existing=skip_existing)
            if result == "ok":
                ok += 1
                print("  -> zapisano")
            else:
                skipped += 1
                print("  -> pominięto (już istnieje)")
            page.wait_for_timeout(350)
        except KeyboardInterrupt:
            print("\nImport przerwany przez użytkownika.")
            break
        except Exception as e:
            failed += 1
            shot = save_error_screenshot(page, idx, ex["name"])
            msg = f"{type(e).__name__}: {e}"
            log_row(idx, ex, "ERROR", msg)
            print(f"  -> BŁĄD: {msg}")
            print(f"  -> zrzut: {shot}")
            print("\nAutomat zatrzymał się, żeby nie kontynuować w nieznanym stanie.")
            print("Popraw ekran Finezjo lub zamknij błędny modal i uruchom ponownie od tego numeru.")
            break
    print("\n=== PODSUMOWANIE ===")
    print(f"Zapisane: {ok}")
    print(f"Pominięte: {skipped}")
    print(f"Błędy: {failed}")
    print(f"Log: {LOG_FILE}")


def choose_mode(n: int):
    print("\n=== FINEZJO - AUTOMAT DODAWANIA ĆWICZEŃ ===")
    print(f"Baza: {n} ćwiczeń")
    print("1 - TEST: dodaj tylko pierwsze ćwiczenie")
    print("2 - Importuj wszystkie ćwiczenia")
    print("3 - Importuj od wybranego numeru")
    print("4 - Importuj wybrany zakres")
    print("5 - Tylko otwórz Finezjo (bez importu)")
    print("0 - Wyjście")
    choice = input("Wybierz: ").strip()
    if choice == "1":
        return 0, 1
    if choice == "2":
        confirm = input(f"Na pewno rozpocząć import do {n} ćwiczeń? Wpisz TAK: ").strip()
        if confirm != "TAK":
            print("Anulowano.")
            return None
        return 0, n
    if choice == "3":
        start = int(input(f"Od numeru (1-{n}): ").strip())
        return max(0, start-1), n
    if choice == "4":
        start = int(input(f"Od numeru (1-{n}): ").strip())
        end = int(input(f"Do numeru ({start}-{n}): ").strip())
        return max(0, start-1), min(n, end)
    if choice == "5":
        return -1, -1
    return None


def main():
    data = load_exercises()
    mode = choose_mode(len(data))
    if mode is None:
        return
    start, end = mode

    PROFILE_DIR.mkdir(exist_ok=True)
    print("\nUruchamiam Chromium. Profil logowania jest przechowywany lokalnie w folderze browser_profile.")
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR),
            headless=False,
            viewport=None,
            args=["--start-maximized"],
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.goto(APP_URL, wait_until="domcontentloaded")

        if start == -1:
            input("Naciśnij ENTER, aby zamknąć automat...")
            context.close()
            return

        wait_for_user(page)
        print("\nUWAGA: możesz przerwać program klawiszami Ctrl+C w tym oknie.")
        import_range(page, data, start, end, skip_existing=True)
        input("\nNaciśnij ENTER, aby zamknąć przeglądarkę...")
        context.close()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nPrzerwano.")
        sys.exit(130)
    except Exception as e:
        print(f"\nBŁĄD KRYTYCZNY: {type(e).__name__}: {e}")
        print("Program nie wykonuje dalszych operacji.")
        input("Naciśnij ENTER, aby zakończyć...")
        raise
