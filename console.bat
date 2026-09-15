@echo off
setlocal enabledelayedexpansion
title Nexyris Local - Interactive Console CLI
color 0B

:: Switch to the USB drive and directory where console.bat lives
cd /d "%~dp0"
set "NEXYRIS_ROOT=%CD%"

:: Strict USB Pendrive Confinement - Zero Footprint on Host C: Drive
if not exist "%NEXYRIS_ROOT%\temp" mkdir "%NEXYRIS_ROOT%\temp"
set "TEMP=%NEXYRIS_ROOT%\temp"
set "TMP=%NEXYRIS_ROOT%\temp"
set "TMPDIR=%NEXYRIS_ROOT%\temp"

:: Check for embedded portable Node or system Node
if exist "%NEXYRIS_ROOT%\tools\node-win\node.exe" (
    set "PATH=%NEXYRIS_ROOT%\tools\node-win;!PATH!"
)

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo =======================================================
    echo [ERROR] Node.js runtime not found on host computer.
    echo Please install Node.js or place portable node in tools\node-win.
    echo =======================================================
    pause
    exit /b 1
)

:: Launch Interactive Console Mode
node "%NEXYRIS_ROOT%\scripts\cli.js"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [Console CLI terminated with code %ERRORLEVEL%]
    pause
)
