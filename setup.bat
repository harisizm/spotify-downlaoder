@echo off
chcp 65001 >nul
title Pasooriizm - Setup
color 0A

:: Ensure working directory is always this script's directory
cd /d "%~dp0"

:: ============================================================
:: Check for Administrator privileges & Auto-elevate
:: ============================================================
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ==============================================================
    echo  *  Administrator privileges required. Requesting access...   *
    echo  ==============================================================
    echo.
    powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/k cd /d """%~dp0""" && """%~f0""" -elevated' -Verb RunAs"
    exit /b
)

echo.
echo  ==============================================================
echo  *                                                            *
echo  *               PASOORIIZM - One-Time Setup                  *
echo  *              Spotify Playlist Downloader                   *
echo  *                                                            *
echo  ==============================================================
echo.
echo  This will install everything needed to run Pasooriizm.
echo  Please wait while we set things up...
echo.
echo  --------------------------------------------------------------

:: Ensure standard node installation paths are in current PATH
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%APPDATA%\npm;%PATH%"

:: ============================================================
:: Step 1: Check / Install Node.js
:: ============================================================
echo.
echo  [1/7] Checking for Node.js...

where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=1" %%v in ('node --version') do echo         Found Node.js %%v [OK]
    goto :node_done
)

echo         Node.js not found. Downloading installer...
echo.

where curl.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    curl.exe -L --progress-bar -o "%TEMP%\node-installer.msi" "https://nodejs.org/dist/v22.23.2/node-v22.23.2-x64.msi"
) else (
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://nodejs.org/dist/v22.23.2/node-v22.23.2-x64.msi', '%TEMP%\node-installer.msi')"
)

if exist "%TEMP%\node-installer.msi" (
    echo.
    echo         Installing Node.js (please wait)...
    start /wait msiexec.exe /i "%TEMP%\node-installer.msi" /qn /norestart
    
    :: Refresh PATH
    set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%APPDATA%\npm;%PATH%"
    
    where node >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo         Silent install requires user confirmation. Launching setup window...
        start /wait msiexec.exe /i "%TEMP%\node-installer.msi" /qb /norestart
        set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%APPDATA%\npm;%PATH%"
    )
    
    del "%TEMP%\node-installer.msi" 2>nul
    
    where node >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        for /f "tokens=1" %%v in ('node --version') do echo         Node.js %%v installed successfully [OK]
    ) else (
        echo         WARNING: Node.js installation finished. If next steps fail, please restart your computer.
    )
) else (
    echo.
    echo  ==============================================================
    echo  *  ERROR: Could not download Node.js installer.              *
    echo  *  Please manually install Node.js from:                     *
    echo  *  https://nodejs.org/                                       *
    echo  ==============================================================
    echo.
    echo  Press any key to exit...
    pause >nul
    exit /b 1
)

:node_done

:: ============================================================
:: Step 2: Check / Install yt-dlp
:: ============================================================
echo.
echo  [2/7] Checking for yt-dlp...

if not exist "worker\bin" mkdir "worker\bin"

if exist "worker\bin\yt-dlp.exe" (
    echo         Found yt-dlp in worker\bin\ [OK]
    goto :ytdlp_done
)

where yt-dlp >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo         Found yt-dlp on system PATH [OK]
    goto :ytdlp_done
)

echo         Downloading yt-dlp...
where curl.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    curl.exe -L --progress-bar -o "worker\bin\yt-dlp.exe" "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
) else (
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', 'worker\bin\yt-dlp.exe')"
)

if exist "worker\bin\yt-dlp.exe" (
    echo         yt-dlp installed successfully [OK]
) else (
    echo         WARNING: Could not download yt-dlp.
)

:ytdlp_done

:: ============================================================
:: Step 3: Check / Install ffmpeg
:: ============================================================
echo.
echo  [3/7] Checking for ffmpeg...

if exist "worker\bin\ffmpeg.exe" (
    echo         Found ffmpeg in worker\bin\ [OK]
    goto :ffmpeg_done
)

where ffmpeg >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo         Found ffmpeg on system PATH [OK]
    goto :ffmpeg_done
)

echo         Downloading ffmpeg (this may take 1-2 minutes)...
where curl.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    curl.exe -L --progress-bar -o "%TEMP%\ffmpeg.zip" "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
) else (
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip', '%TEMP%\ffmpeg.zip')"
)

if exist "%TEMP%\ffmpeg.zip" (
    echo         Extracting ffmpeg binaries...
    powershell -NoProfile -Command "Expand-Archive -Path '%TEMP%\ffmpeg.zip' -DestinationPath '%TEMP%\ffmpeg-extract' -Force; $d = (Get-ChildItem '%TEMP%\ffmpeg-extract' -Directory | Select-Object -First 1).FullName; Copy-Item (Join-Path $d 'bin\ffmpeg.exe') 'worker\bin\ffmpeg.exe' -Force; Copy-Item (Join-Path $d 'bin\ffprobe.exe') 'worker\bin\ffprobe.exe' -Force; Remove-Item '%TEMP%\ffmpeg.zip' -Force -ErrorAction SilentlyContinue; Remove-Item '%TEMP%\ffmpeg-extract' -Recurse -Force -ErrorAction SilentlyContinue"
    if exist "worker\bin\ffmpeg.exe" (
        echo         ffmpeg installed successfully [OK]
    ) else (
        echo         WARNING: Extraction failed for ffmpeg.
    )
) else (
    echo         WARNING: Could not download ffmpeg archive.
)

:ffmpeg_done

:: ============================================================
:: Step 4: Install frontend dependencies
:: ============================================================
echo.
echo  [4/7] Installing frontend dependencies (npm install)...
call npm install --no-audit --no-fund
if %ERRORLEVEL% EQU 0 (
    echo         Frontend dependencies installed [OK]
) else (
    echo         WARNING: Retrying frontend dependencies...
    call npm install
)

:: ============================================================
:: Step 5: Install worker backend dependencies
:: ============================================================
echo.
echo  [5/7] Installing worker backend dependencies...
pushd worker
call npm install --no-audit --no-fund
if %ERRORLEVEL% EQU 0 (
    echo         Worker dependencies installed [OK]
) else (
    echo         WARNING: Retrying worker dependencies...
    call npm install
)
popd

:: ============================================================
:: Step 6: Create environment config files
:: ============================================================
echo.
echo  [6/7] Setting up environment configuration...

if not exist ".env.local" (
    if exist ".env.example" (
        copy ".env.example" ".env.local" >nul 2>&1
        echo         Created .env.local from template [OK]
    ) else (
        echo NEXT_PUBLIC_WORKER_API_URL=http://localhost:3001 > ".env.local"
        echo         Created .env.local [OK]
    )
) else (
    echo         .env.local already exists [OK]
)

if not exist "worker\.env" (
    if exist "worker\.env.example" (
        copy "worker\.env.example" "worker\.env" >nul 2>&1
        echo         Created worker\.env from template [OK]
    ) else (
        echo PORT=3001 > "worker\.env"
        echo         Created worker\.env [OK]
    )
) else (
    echo         worker\.env already exists [OK]
)

:: ============================================================
:: Step 7: Verify installation
:: ============================================================
echo.
echo  [7/7] Verifying installation...

set "VERIFY_OK=1"

where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=1" %%v in ('node --version') do echo         Node.js %%v [OK]
) else (
    echo         Node.js [MISSING]
    set "VERIFY_OK=0"
)

if exist "worker\bin\yt-dlp.exe" (
    echo         yt-dlp [OK]
) else (
    where yt-dlp >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo         yt-dlp (system) [OK]
    ) else (
        echo         yt-dlp [MISSING]
        set "VERIFY_OK=0"
    )
)

if exist "worker\bin\ffmpeg.exe" (
    echo         ffmpeg [OK]
) else (
    where ffmpeg >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo         ffmpeg (system) [OK]
    ) else (
        echo         ffmpeg [MISSING]
        set "VERIFY_OK=0"
    )
)

if exist "node_modules" (
    echo         Frontend dependencies [OK]
) else (
    echo         Frontend dependencies [MISSING]
    set "VERIFY_OK=0"
)

if exist "worker\node_modules" (
    echo         Worker dependencies [OK]
) else (
    echo         Worker dependencies [MISSING]
    set "VERIFY_OK=0"
)

if exist ".env.local" (
    echo         .env.local [OK]
) else (
    echo         .env.local [MISSING]
)

:: ============================================================
:: Done!
:: ============================================================
echo.
echo  --------------------------------------------------------------
echo.

if "%VERIFY_OK%"=="1" (
    echo  ==============================================================
    echo  *                                                            *
    echo  *                    SETUP COMPLETE! [OK]                    *
    echo  *                                                            *
    echo  *  To use Pasooriizm:                                        *
    echo  *                                                            *
    echo  *    Double-click  Pasooriizm.bat                            *
    echo  *                                                            *
    echo  *  The app will open in your browser automatically.          *
    echo  *                                                            *
    echo  ==============================================================
) else (
    echo  ==============================================================
    echo  *                                                            *
    echo  *               SETUP FINISHED (with warnings)               *
    echo  *                                                            *
    echo  *  Review the warnings above before launching.               *
    echo  *                                                            *
    echo  ==============================================================
)
echo.
echo  Press any key to close this window...
pause >nul
