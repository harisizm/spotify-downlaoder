@echo off
chcp 65001 >nul
title Pasooriizm - Setup
color 0A
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
echo  [1/5] Checking for Node.js...

where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=1" %%v in ('node --version') do echo         Found Node.js %%v [OK]
    goto :node_done
)

echo         Node.js not found. Downloading installer...
echo.

powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $url = 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi'; $file = '$env:TEMP\node-installer.msi'; $wc = New-Object System.Net.WebClient; $wc.Headers.Add('User-Agent','Mozilla/5.0'); $done = $false; Register-ObjectEvent $wc DownloadProgressChanged -Action { $p = $EventArgs.ProgressPercentage; $in = [math]::Round($EventArgs.BytesReceived/1MB,2); $tot = [math]::Round($EventArgs.TotalBytesToReceive/1MB,2); $b = [math]::Floor($p/4); $s = 25-$b; Write-Host -NoNewline ('`r        [' + ('='*$b) + (' '*$s) + ('] {0}% ({1} MB / {2} MB)   ' -f $p, $in, $tot)) } | Out-Null; Register-ObjectEvent $wc DownloadFileCompleted -Action { $global:done = $true } | Out-Null; $wc.DownloadFileAsync([Uri]$url, $file); while (-not $global:done) { Start-Sleep -Milliseconds 100 }; Write-Host '' }"

if exist "%TEMP%\node-installer.msi" (
    echo         Running Node.js installer (please wait)...
    msiexec /i "%TEMP%\node-installer.msi" /qn /norestart
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
    del "%TEMP%\node-installer.msi" 2>nul
    echo         Node.js installed successfully [OK]
) else (
    echo.
    echo  ==============================================================
    echo  *  ERROR: Could not install Node.js automatically.           *
    echo  *  Please install it from: https://nodejs.org/              *
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
echo  [2/5] Checking for yt-dlp...

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

echo         Downloading yt-dlp with live progress...
powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'; $file = 'worker\bin\yt-dlp.exe'; $wc = New-Object System.Net.WebClient; $wc.Headers.Add('User-Agent','Mozilla/5.0'); $done = $false; Register-ObjectEvent $wc DownloadProgressChanged -Action { $p = $EventArgs.ProgressPercentage; $in = [math]::Round($EventArgs.BytesReceived/1MB,2); $tot = [math]::Round($EventArgs.TotalBytesToReceive/1MB,2); $b = [math]::Floor($p/4); $s = 25-$b; Write-Host -NoNewline ('`r        [' + ('='*$b) + (' '*$s) + ('] {0}% ({1} MB / {2} MB)   ' -f $p, $in, $tot)) } | Out-Null; Register-ObjectEvent $wc DownloadFileCompleted -Action { $global:done = $true } | Out-Null; $wc.DownloadFileAsync([Uri]$url, $file); while (-not $global:done) { Start-Sleep -Milliseconds 100 }; Write-Host '' }"

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
echo  [3/5] Checking for ffmpeg...

if exist "worker\bin\ffmpeg.exe" (
    echo         Found ffmpeg in worker\bin\ [OK]
    goto :ffmpeg_done
)

where ffmpeg >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo         Found ffmpeg on system PATH [OK]
    goto :ffmpeg_done
)

echo         Downloading ffmpeg with live progress...
powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $url = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'; $file = '$env:TEMP\ffmpeg.zip'; $wc = New-Object System.Net.WebClient; $wc.Headers.Add('User-Agent','Mozilla/5.0'); $done = $false; Register-ObjectEvent $wc DownloadProgressChanged -Action { $p = $EventArgs.ProgressPercentage; $in = [math]::Round($EventArgs.BytesReceived/1MB,2); $tot = [math]::Round($EventArgs.TotalBytesToReceive/1MB,2); $b = [math]::Floor($p/4); $s = 25-$b; Write-Host -NoNewline ('`r        [' + ('='*$b) + (' '*$s) + ('] {0}% ({1} MB / {2} MB)   ' -f $p, $in, $tot)) } | Out-Null; Register-ObjectEvent $wc DownloadFileCompleted -Action { $global:done = $true } | Out-Null; $wc.DownloadFileAsync([Uri]$url, $file); while (-not $global:done) { Start-Sleep -Milliseconds 100 }; Write-Host '' }"

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
echo  [4/5] Installing frontend dependencies (npm install)...
call npm install --prefer-offline --no-audit --no-fund
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
echo  [5/5] Installing worker backend dependencies...
pushd worker
call npm install --prefer-offline --no-audit --no-fund
if %ERRORLEVEL% EQU 0 (
    echo         Worker dependencies installed [OK]
) else (
    echo         WARNING: Retrying worker dependencies...
    call npm install
)
popd

:: ============================================================
:: Done!
:: ============================================================
echo.
echo  --------------------------------------------------------------
echo.
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
echo.
pause
