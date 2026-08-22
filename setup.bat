@echo off
chcp 65001 >nul
title Pasooriizm - Setup
color 0A

:: Ensure working directory is always this script's directory
cd /d "%~dp0"

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

:: Ensure project portable bin and standard Node.js paths are in PATH
set "PATH=%~dp0bin\node;%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%APPDATA%\npm;%PATH%"

:: ============================================================
:: Step 1: Check / Install Node.js
:: ============================================================
echo.
echo  [1/7] Checking for Node.js...

if exist "%~dp0bin\node\node.exe" goto :node_found_portable

where node >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :node_found_system

echo         Node.js not found. Downloading standalone package...
echo.

if not exist "%~dp0bin\node" mkdir "%~dp0bin\node"

where curl.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :download_node_curl

powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://nodejs.org/dist/v22.23.2/node-v22.23.2-win-x64.zip', '%TEMP%\node-dist.zip')"
goto :extract_node

:download_node_curl
curl.exe -L --progress-bar -o "%TEMP%\node-dist.zip" "https://nodejs.org/dist/v22.23.2/node-v22.23.2-win-x64.zip"

:extract_node
if not exist "%TEMP%\node-dist.zip" goto :node_fail

echo.
echo         Extracting Node.js (please wait)...

if exist "%TEMP%\node-extract" rd /s /q "%TEMP%\node-extract" >nul 2>&1
mkdir "%TEMP%\node-extract"

tar.exe -xf "%TEMP%\node-dist.zip" -C "%TEMP%\node-extract" 2>nul
if %ERRORLEVEL% NEQ 0 (
    powershell -NoProfile -Command "Expand-Archive -Path '%TEMP%\node-dist.zip' -DestinationPath '%TEMP%\node-extract' -Force"
)

for /d %%D in ("%TEMP%\node-extract\node-v*") do (
    robocopy "%%D" "%~dp0bin\node" /E /MOVE /NFL /NDL /NJH /NJS >nul 2>&1
)

rd /s /q "%TEMP%\node-extract" >nul 2>&1
del /f /q "%TEMP%\node-dist.zip" >nul 2>&1

set "PATH=%~dp0bin\node;%PATH%"

if exist "%~dp0bin\node\node.exe" goto :node_ready
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :node_ready

:node_fail
echo.
echo  ==============================================================
echo  *  ERROR: Could not setup Node.js automatically.             *
echo  *  Please manually install Node.js from:                     *
echo  *  https://nodejs.org/                                       *
echo  ==============================================================
echo.
echo  Press any key to exit...
pause >nul
exit /b 1

:node_found_portable
for /f "tokens=1" %%v in ('"%~dp0bin\node\node.exe" --version') do echo         Found standalone Node.js %%v [OK]
goto :node_done

:node_found_system
for /f "tokens=1" %%v in ('node --version') do echo         Found system Node.js %%v [OK]
goto :node_done

:node_ready
for /f "tokens=1" %%v in ('"%~dp0bin\node\node.exe" --version 2^>nul') do echo         Node.js %%v ready [OK]

:node_done

:: ============================================================
:: Step 2: Check / Install yt-dlp
:: ============================================================
echo.
echo  [2/7] Checking for yt-dlp...

if not exist "%~dp0worker\bin" mkdir "%~dp0worker\bin"

if exist "%~dp0worker\bin\yt-dlp.exe" goto :ytdlp_found_local

where yt-dlp >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :ytdlp_found_system

echo         Downloading yt-dlp...
where curl.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :download_ytdlp_curl

powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', '%~dp0worker\bin\yt-dlp.exe')"
goto :ytdlp_check

:download_ytdlp_curl
curl.exe -L --progress-bar -o "%~dp0worker\bin\yt-dlp.exe" "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"

:ytdlp_check
if exist "%~dp0worker\bin\yt-dlp.exe" (
    echo         yt-dlp installed successfully [OK]
) else (
    echo         WARNING: Could not download yt-dlp.
)
goto :ytdlp_done

:ytdlp_found_local
echo         Found yt-dlp in worker\bin\ [OK]
goto :ytdlp_done

:ytdlp_found_system
echo         Found yt-dlp on system PATH [OK]

:ytdlp_done

:: ============================================================
:: Step 3: Check / Install ffmpeg
:: ============================================================
echo.
echo  [3/7] Checking for ffmpeg...

if exist "%~dp0worker\bin\ffmpeg.exe" goto :ffmpeg_found_local

where ffmpeg >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :ffmpeg_found_system

echo         Downloading ffmpeg (this may take 1-2 minutes)...
where curl.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :download_ffmpeg_curl

powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip', '%TEMP%\ffmpeg.zip')"
goto :extract_ffmpeg

:download_ffmpeg_curl
curl.exe -L --progress-bar -o "%TEMP%\ffmpeg.zip" "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"

:extract_ffmpeg
if not exist "%TEMP%\ffmpeg.zip" (
    echo         WARNING: Could not download ffmpeg archive.
    goto :ffmpeg_done
)

echo         Extracting ffmpeg binaries...
if exist "%TEMP%\ffmpeg-extract" rd /s /q "%TEMP%\ffmpeg-extract" >nul 2>&1
mkdir "%TEMP%\ffmpeg-extract"

tar.exe -xf "%TEMP%\ffmpeg.zip" -C "%TEMP%\ffmpeg-extract" 2>nul
if %ERRORLEVEL% NEQ 0 (
    powershell -NoProfile -Command "Expand-Archive -Path '%TEMP%\ffmpeg.zip' -DestinationPath '%TEMP%\ffmpeg-extract' -Force"
)

for /d %%D in ("%TEMP%\ffmpeg-extract\ffmpeg-*") do (
    if exist "%%D\bin\ffmpeg.exe" copy /y "%%D\bin\ffmpeg.exe" "%~dp0worker\bin\ffmpeg.exe" >nul 2>&1
    if exist "%%D\bin\ffprobe.exe" copy /y "%%D\bin\ffprobe.exe" "%~dp0worker\bin\ffprobe.exe" >nul 2>&1
)

rd /s /q "%TEMP%\ffmpeg-extract" >nul 2>&1
del /f /q "%TEMP%\ffmpeg.zip" >nul 2>&1

if exist "%~dp0worker\bin\ffmpeg.exe" (
    echo         ffmpeg installed successfully [OK]
) else (
    echo         WARNING: Extraction failed for ffmpeg.
)
goto :ffmpeg_done

:ffmpeg_found_local
echo         Found ffmpeg in worker\bin\ [OK]
goto :ffmpeg_done

:ffmpeg_found_system
echo         Found ffmpeg on system PATH [OK]

:ffmpeg_done

:: ============================================================
:: Step 4: Install frontend dependencies
:: ============================================================
echo.
echo  [4/7] Installing frontend dependencies (npm install)...
call npm install --no-audit --no-fund
if %ERRORLEVEL% NEQ 0 (
    echo         Retrying frontend dependencies...
    call npm install
)
if exist "node_modules" (
    echo         Frontend dependencies installed [OK]
) else (
    echo         WARNING: Frontend dependencies might have encountered issues.
)

:: ============================================================
:: Step 5: Install worker backend dependencies
:: ============================================================
echo.
echo  [5/7] Installing worker backend dependencies...
pushd worker
call npm install --no-audit --no-fund
if %ERRORLEVEL% NEQ 0 (
    echo         Retrying worker dependencies...
    call npm install
)
if exist "node_modules" (
    echo         Worker dependencies installed [OK]
) else (
    echo         WARNING: Worker dependencies might have encountered issues.
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
    if exist "%~dp0bin\node\node.exe" (
        for /f "tokens=1" %%v in ('"%~dp0bin\node\node.exe" --version') do echo         Node.js %%v [portable] [OK]
    ) else (
        echo         Node.js [MISSING]
        set "VERIFY_OK=0"
    )
)

if exist "worker\bin\yt-dlp.exe" (
    echo         yt-dlp [OK]
) else (
    where yt-dlp >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo         yt-dlp [system] [OK]
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
        echo         ffmpeg [system] [OK]
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
    echo  *               SETUP FINISHED [with warnings]               *
    echo  *                                                            *
    echo  *  Review the warnings above before launching.               *
    echo  *                                                            *
    echo  ==============================================================
)
echo.
echo  Press any key to close this window...
pause >nul
