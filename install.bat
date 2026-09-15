@echo off
setlocal enabledelayedexpansion
title Nexyris Local - USB Setup & Model Installer
color 0E

cd /d "%~dp0"
echo ===================================================
echo     NEXYRIS LOCAL - PORTABLE USB SETUP             
echo ===================================================
echo.
echo This will configure portable engines and download
echo chosen AI model(s) directly onto your USB drive.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-core.ps1"

echo.
echo ===================================================
echo Setup complete! Launch Nexyris with Nexyris.bat
echo ===================================================
echo.
pause
