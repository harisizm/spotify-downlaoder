@echo off
chcp 65001 >nul
title Pasooriizm - Spotify Playlist Downloader
color 0A

echo.
echo  ==============================================================
echo  *                                                            *
echo  *               PASOORIIZM - Starting Up...                  *
echo  *              Spotify Playlist Downloader                   *
echo  *                                                            *
echo  ==============================================================
echo.

:: Check if setup has been run
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Node.js is not installed.
    echo  Please run setup.bat first!
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo  [ERROR] Dependencies not installed.
    echo  Please run setup.bat first!
    echo.
    pause
    exit /b 1
)

:: ============================================================
:: Clean up any previous stale processes on ports 3000 & 3001
:: ============================================================
echo  [>] Ensuring ports 3000 & 3001 are free...
taskkill /FI "WindowTitle eq Pasooriizm Worker*" /F >nul 2>&1
taskkill /FI "WindowTitle eq Pasooriizm Frontend*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 :3001" 2^>nul') do taskkill /f /pid %%a >nul 2>&1

:: ============================================================
:: Start Worker Backend (minimized background window)
:: ============================================================
echo  [>] Starting download engine (Port 3001)...
start "Pasooriizm Worker" /min cmd /c "cd /d "%~dp0worker" && npm run dev"

:: Wait for worker to boot
timeout /t 2 /nobreak >nul

:: ============================================================
:: Start Next.js Frontend (minimized background window)
:: ============================================================
echo  [>] Starting web interface (Port 3000)...
start "Pasooriizm Frontend" /min cmd /c "cd /d "%~dp0" && npm run dev"

:: Wait for frontend to boot
timeout /t 4 /nobreak >nul

:: ============================================================
:: Open browser
:: ============================================================
echo  [>] Opening browser: http://localhost:3000
start http://localhost:3000

echo.
echo  --------------------------------------------------------------
echo.
echo  ==============================================================
echo  *                                                            *
echo  *              [OK] Pasooriizm is running!                   *
echo  *                                                            *
echo  *              Open http://localhost:3000 in browser         *
echo  *                                                            *
echo  *              To stop: Press any key in this window         *
echo  *                                                            *
echo  ==============================================================
echo.

:: Keep this window open — pressing any key stops all background servers
echo  Press any key to STOP Pasooriizm and close all background servers...
pause >nul

:: Kill the background server windows and release all ports
taskkill /FI "WindowTitle eq Pasooriizm Worker*" /F >nul 2>&1
taskkill /FI "WindowTitle eq Pasooriizm Frontend*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 :3001" 2^>nul') do taskkill /f /pid %%a >nul 2>&1

echo.
echo  Pasooriizm stopped. Goodbye!
timeout /t 2 /nobreak >nul
