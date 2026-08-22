@echo off
chcp 65001 >nul
title Pasooriizm - Spotify Playlist Downloader
color 0A

:: Ensure working directory is always this script's directory
cd /d "%~dp0"

:: Refresh PATH in case Node.js is portable or recently installed
set "PATH=%~dp0bin\node;%~dp0worker\bin;%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%APPDATA%\npm;%PATH%"

echo.
echo  ==============================================================
echo  *                                                            *
echo  *               PASOORIIZM - Starting Up...                  *
echo  *              Spotify Playlist Downloader                   *
echo  *                                                            *
echo  ==============================================================
echo.

:: Check if Node.js is available
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if not exist "%~dp0bin\node\node.exe" (
        echo  [ERROR] Node.js is not installed or not found in PATH.
        echo  Please run setup.bat first!
        echo.
        pause
        exit /b 1
    )
)

if not exist "node_modules" (
    echo  [ERROR] Frontend dependencies not installed.
    echo  Please run setup.bat first!
    echo.
    pause
    exit /b 1
)

if not exist "worker\node_modules" (
    echo  [ERROR] Worker dependencies not installed.
    echo  Please run setup.bat first!
    echo.
    pause
    exit /b 1
)

:: Ensure environment config files exist
if not exist ".env.local" (
    if exist ".env.example" (
        copy ".env.example" ".env.local" >nul 2>&1
    ) else (
        echo NEXT_PUBLIC_WORKER_API_URL=http://localhost:3001 > ".env.local"
    )
)

if not exist "worker\.env" (
    if exist "worker\.env.example" (
        copy "worker\.env.example" "worker\.env" >nul 2>&1
    ) else (
        echo PORT=3001 > "worker\.env"
    )
)

:: ============================================================
:: Clean up any previous stale processes on ports 3000 & 3001
:: ============================================================
echo  [*] Ensuring ports 3000 and 3001 are free...
taskkill /FI "WindowTitle eq Pasooriizm Worker*" /F >nul 2>&1
taskkill /FI "WindowTitle eq Pasooriizm Frontend*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 :3001" 2^>nul') do taskkill /f /pid %%a >nul 2>&1

:: ============================================================
:: Start Worker Backend (minimized background window)
:: ============================================================
echo  [*] Starting download engine (Port 3001)...
start "Pasooriizm Worker" /min cmd /c "cd /d "%~dp0worker" && npm run dev"

:: Wait for worker to boot
ping -n 3 127.0.0.1 >nul 2>&1

:: ============================================================
:: Start Next.js Frontend (minimized background window)
:: ============================================================
echo  [*] Starting web interface (Port 3000)...
start "Pasooriizm Frontend" /min cmd /c "cd /d "%~dp0" && npm run dev"

:: Wait for frontend to boot
ping -n 5 127.0.0.1 >nul 2>&1

:: ============================================================
:: Open browser
:: ============================================================
echo  [*] Opening browser: http://localhost:3000
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

:: Keep this window open -- pressing any key stops all background servers
echo  Press any key to STOP Pasooriizm and close all background servers...
pause >nul

:: Kill the background server windows and release all ports
taskkill /FI "WindowTitle eq Pasooriizm Worker*" /F >nul 2>&1
taskkill /FI "WindowTitle eq Pasooriizm Frontend*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 :3001" 2^>nul') do taskkill /f /pid %%a >nul 2>&1

echo.
echo  Pasooriizm stopped. Goodbye!
ping -n 2 127.0.0.1 >nul 2>&1
