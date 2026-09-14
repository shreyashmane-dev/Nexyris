@echo off
setlocal enabledelayedexpansion
title Nexyris Local - Portable Local AI Studio

:: Determine application root dynamically from batch file location
set "SCRIPT_DIR=%~dp0"
:: Remove trailing backslash if present
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "NEXYRIS_ROOT=%SCRIPT_DIR%"

echo =======================================================
echo          NEXYRIS LOCAL - PORTABLE AI STUDIO
echo      Your AI. Your Models. Your Drive. Your Data.
echo =======================================================
echo.
echo [1/3] Detecting portable environment...
echo Portable Root: %NEXYRIS_ROOT%

:: Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js runtime not found on host computer.
    echo Please ensure Node.js is installed on this PC.
    pause
    exit /b 1
)

echo [2/3] Starting Nexyris Local Server...
set "PORT=38192"

:: Start server in background
start /B "" node "%NEXYRIS_ROOT%\server\index.js"

:: Wait for server health check
echo [3/3] Waiting for studio interface to initialize...
timeout /t 2 /nobreak >nul

:: Attempt to open in clean application window mode (Chrome / Edge)
set "APP_URL=http://127.0.0.1:%PORT%"

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%APP_URL%"
    goto finish
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="%APP_URL%"
    goto finish
)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%APP_URL%"
    goto finish
)

:: Fallback to default browser
start "" "%APP_URL%"

:finish
echo.
echo =======================================================
echo Nexyris Local is running at %APP_URL%
echo Close this window or use the in-app "Safe Eject" to exit.
echo =======================================================
echo.
pause
