@echo off
chcp 65001 > nul
title Finezjo Automat
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Program nie jest jeszcze zainstalowany.
  echo Uruchamiam instalator...
  call INSTALL.bat
  if errorlevel 1 exit /b 1
)

".venv\Scripts\python.exe" finezjo_importer.py
pause
