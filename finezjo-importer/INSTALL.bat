@echo off
chcp 65001 > nul
title Finezjo Automat - instalacja
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
  set PY=py
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    set PY=python
  ) else (
    echo.
    echo [BLAD] Nie znaleziono Pythona.
    echo Zainstaluj Python 3.11 lub nowszy z https://www.python.org/downloads/
    echo Podczas instalacji zaznacz "Add Python to PATH".
    pause
    exit /b 1
  )
)

if not exist ".venv\Scripts\python.exe" (
  echo Tworze srodowisko programu...
  %PY% -m venv .venv
  if errorlevel 1 goto error
)

echo Aktualizuje pip...
".venv\Scripts\python.exe" -m pip install --upgrade pip

echo Instaluje Playwright...
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto error

echo Instaluje przegladarke Chromium...
".venv\Scripts\python.exe" -m playwright install chromium
if errorlevel 1 goto error

echo.
echo Instalacja zakonczona.
echo Teraz uruchom START.bat
pause
exit /b 0

:error
echo.
echo [BLAD] Instalacja nie powiodla sie.
pause
exit /b 1
