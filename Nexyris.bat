@echo off
setlocal enabledelayedexpansion
title Nexyris Local - Portable AI Studio
color 0B

:: Switch to the USB drive and directory where Nexyris.bat lives
cd /d "%~dp0"
set "NEXYRIS_ROOT=%CD%"

:: Strict USB Pendrive Confinement - Zero Footprint on Host C: Drive
if not exist "%NEXYRIS_ROOT%\temp" mkdir "%NEXYRIS_ROOT%\temp"
if not exist "%NEXYRIS_ROOT%\data\browser-profile" mkdir "%NEXYRIS_ROOT%\data\browser-profile"
set "TEMP=%NEXYRIS_ROOT%\temp"
set "TMP=%NEXYRIS_ROOT%\temp"
set "TMPDIR=%NEXYRIS_ROOT%\temp"

echo =======================================================
echo          NEXYRIS LOCAL - PORTABLE AI STUDIO
echo      Your AI. Your Models. Your Drive. Your Data.
echo =======================================================
echo.
echo [1/3] Detecting portable pendrive environment...
echo Portable USB Root: %NEXYRIS_ROOT%
echo Storage Confinement: 100%% Portable (Zero C:\ Footprint)

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

:: Ensure offline pre-bundled llama.cpp engine is unpacked into bin (Zero Internet Required)
if not exist "%NEXYRIS_ROOT%\bin\llama-server.exe" (
    if not exist "%NEXYRIS_ROOT%\bin" mkdir "%NEXYRIS_ROOT%\bin"
    if exist "%NEXYRIS_ROOT%\runtime\windows\llama\llama-server.exe" (
        echo [Offline Setup] Copying pre-bundled llama.cpp engine to bin...
        copy /Y "%NEXYRIS_ROOT%\runtime\windows\llama\*.*" "%NEXYRIS_ROOT%\bin\" >nul 2>&1
    ) else if exist "%NEXYRIS_ROOT%\runtime\windows\llama-portable.zip" (
        echo [Offline Setup] Unzipping pre-bundled llama.cpp engine to bin...
        powershell -NoProfile -Command "Expand-Archive -Path '%NEXYRIS_ROOT%\runtime\windows\llama-portable.zip' -DestinationPath '%NEXYRIS_ROOT%\bin' -Force"
    )
)

echo.
echo =======================================================
echo Select Interface Mode:
echo   [1] GUI Studio   (Windowed Desktop Browser Mode)
echo   [2] Console Mode (100%% Terminal Interactive CLI)
echo =======================================================
echo.
set "USER_MODE=1"
set /p "USER_MODE=Enter choice [1 or 2, default: 1]: "

if "%USER_MODE%"=="2" (
    goto launch_console
)

echo.
echo [2/3] Starting Nexyris Local Server on USB...
set "PORT=38192"

:: Start server in background with explicit working directory on USB drive
start /B "" /D "%NEXYRIS_ROOT%" node "%NEXYRIS_ROOT%\server\index.js"

echo [3/3] Launching Nexyris Studio...
timeout /t 2 /nobreak >nul

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
exit /b 0

:launch_console
cls
node "%NEXYRIS_ROOT%\scripts\cli.js"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [Console CLI terminated with code %ERRORLEVEL%]
    pause
)
exit /b 0
