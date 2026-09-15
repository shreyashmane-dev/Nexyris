@echo off
setlocal enabledelayedexpansion
title Nexyris Local - Portable AI Studio
color 0B

:: Switch to the USB drive and directory where Nexyris.bat lives
cd /d "%~dp0"
set "NEXYRIS_ROOT=%CD%"

echo =======================================================
echo          NEXYRIS LOCAL - PORTABLE AI STUDIO
echo      Your AI. Your Models. Your Drive. Your Data.
echo =======================================================
echo.
echo [1/3] Detecting portable pendrive environment...
echo Portable USB Root: %NEXYRIS_ROOT%

:: Check for embedded portable Node or system Node
if exist "%NEXYRIS_ROOT%\tools\node-win\node.exe" (
    set "PATH=%NEXYRIS_ROOT%\tools\node-win;!PATH!"
)

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js runtime not found on host computer.
    echo Please install Node.js on this PC or place portable node in tools\node-win.
    pause
    exit /b 1
)

echo [2/3] Starting Nexyris Local Server on USB...
set "PORT=38192"

:: Start server in background with explicit working directory on USB drive
start /B "" /D "%NEXYRIS_ROOT%" node "%NEXYRIS_ROOT%\server\index.js"

echo [3/3] Waiting for server to initialize...
set /a attempts=0
:wait_server
timeout /t 1 /nobreak >nul
set /a attempts+=1
powershell -NoProfile -Command "(New-Object System.Net.Sockets.TcpClient).Connect('127.0.0.1', %PORT%)" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if !attempts! LSS 15 (
        goto wait_server
    )
)

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
echo Nexyris Local is running from your USB drive at %APP_URL%
echo Close this window or use the in-app "Safe Eject" to exit.
echo =======================================================
echo.
pause
