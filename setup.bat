@echo off
chcp 65001 >nul
title Pasooriizm - Setup
color 0A

:: ============================================================
:: Auto-elevate to Administrator if not already elevated
:: ============================================================
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  Requesting Administrator privileges...
    powershell -Command "Start-Process cmd.exe -ArgumentList '/c cd /d \"%~dp0\" && \"%~f0\"' -Verb RunAs"
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

powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'Continue'; Write-Host '        Downloading Node.js v22.23.2 LTS...'; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.23.2/node-v22.23.2-x64.msi' -OutFile \"$env:TEMP\node-installer.msi\" -UseBasicParsing; Write-Host '        Download complete.' }"

if exist "%TEMP%\node-installer.msi" (
    echo         Running Node.js installer (please wait)...
    msiexec /i "%TEMP%\node-installer.msi" /qn /norestart
    if %ERRORLEVEL% NEQ 0 (
        echo         Silent install failed. Launching interactive installer...
        msiexec /i "%TEMP%\node-installer.msi" /qb /norestart
    )
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
    del "%TEMP%\node-installer.msi" 2>nul
    echo         Node.js installed successfully [OK]
) else (
    echo.
    echo  ==============================================================
    echo  *  ERROR: Could not download Node.js installer.              *
    echo  *  Please install it manually: https://nodejs.org/           *
    echo  ==============================================================
    echo.
    pause
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
    echo         Checking for latest updates...
    "worker\bin\yt-dlp.exe" -U >nul 2>&1
    goto :ytdlp_done
)

where yt-dlp >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo         Found yt-dlp on system PATH [OK]
    goto :ytdlp_done
)

echo         Downloading yt-dlp...
powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'Continue'; Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile 'worker\bin\yt-dlp.exe' -UseBasicParsing; Write-Host '        Download complete.' }"

if exist "worker\bin\yt-dlp.exe" (
    echo         yt-dlp downloaded successfully [OK]
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

echo         Downloading ffmpeg (this may take a few minutes)...
powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'Continue'; Invoke-WebRequest -Uri 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' -OutFile \"$env:TEMP\ffmpeg.zip\" -UseBasicParsing; Write-Host '        Download complete.' }"

if exist "%TEMP%\ffmpeg.zip" (
    echo         Extracting ffmpeg binaries...
    powershell -Command "& { Expand-Archive -Path '$env:TEMP\ffmpeg.zip' -DestinationPath '$env:TEMP\ffmpeg-extract' -Force; $ffDir = Get-ChildItem '$env:TEMP\ffmpeg-extract' -Directory | Select-Object -First 1; Copy-Item (Join-Path $ffDir.FullName 'bin\ffmpeg.exe') 'worker\bin\ffmpeg.exe' -Force; Copy-Item (Join-Path $ffDir.FullName 'bin\ffprobe.exe') 'worker\bin\ffprobe.exe' -Force; Remove-Item '$env:TEMP\ffmpeg.zip' -Force; Remove-Item '$env:TEMP\ffmpeg-extract' -Recurse -Force }"
    echo         ffmpeg installed successfully [OK]
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
    copy ".env.example" ".env.local" >nul 2>&1
    if exist ".env.local" (
        echo         Created .env.local from template [OK]
    ) else (
        echo         WARNING: Could not create .env.local
    )
) else (
    echo         .env.local already exists [OK]
)

if not exist "worker\.env" (
    copy "worker\.env.example" "worker\.env" >nul 2>&1
    if exist "worker\.env" (
        echo         Created worker\.env from template [OK]
    ) else (
        echo         WARNING: Could not create worker\.env
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
    echo  *               SETUP COMPLETE (with warnings)               *
    echo  *                                                            *
    echo  *  Some components may be missing. Review the output above.  *
    echo  *                                                            *
    echo  ==============================================================
)
echo.
pause
