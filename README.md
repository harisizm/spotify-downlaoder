# 🎧 Pasooriizm — High-Speed Spotify Playlist Downloader
*Crafted with precision by **[harisizm](https://www.linkedin.com/in/harisizm/)***

A high-performance desktop web application to download full Spotify playlists, albums, and tracks in studio audio quality (up to **320kbps MP3, pristine M4A/AAC, OPUS, and WAV**) — **zero song limits**, **no Spotify account/API keys required**, and **1-click automated setup**.

---

## ⚡ Proven Benchmark: 10+ Songs / Min (~600 Songs / Hour)

<div align="center">
  <img src="./10%20songs%20per%20min.png" alt="10 songs per min speed for M4A download" width="100%" />
</div>

> ### 📊 Real-World Proven Results (M4A Native Mode):
> - **Sustained Throughput**: **10+ songs per minute** in real-world runs
> - **Hourly Output**: **600+ songs per hour** ($\text{10 songs/min} \times \text{60 mins} = \mathbf{600\text{ tracks/hr}}$)
> - **300+ Track Playlists**: Complete entire 324-song libraries in **~25–30 minutes**
> - **Zero Quality Loss**: Pristine 1:1 original AAC stream pass-through (Format `140`) with 0-second conversion delay

---

## ⚡ Key Highlights & Architecture

- 🚀 **Direct In-Memory Search Engine** — Resolves YouTube audio matches in **~0.8s** directly in memory without process spawn lag.
- 🔮 **Pipelined Lookahead Pre-Search** — Proactively searches the next 6–10 upcoming tracks in the background while earlier tracks download, reducing perceived search latency to **0.0 seconds**.
- 🎵 **Native 1:1 Studio Master Audio (M4A / AAC)** — Downloads Google's native studio audio stream (Format `140`) directly with **zero generational transcoding loss** and **zero CPU delay**.
- 🎛️ **Multi-Core 320kbps MP3 Transcoding** — Multi-threaded FFmpeg audio engine (`-threads 0`) with accurate `Content-Length` chunk streaming and automatic temporary file cleanup.
- ⏳ **Sliding-Window EMA Live ETA Pill** — Displays an accurate, jitter-free countdown pill in real time (e.g. `⏳ ~26m 07s remaining (12 songs/min)`).
- 📦 **Animated Live ZIP Packaging Modal** — Real-time visual progress counter (`Gathering files: 142/324...`, `Compressing into ZIP archive...`) when saving full playlists.
- ♾️ **Deep Spotify Pagination (500+ Tracks)** — Automatic recursive metadata fetcher bypassing the 100-track Spotify ceiling with zero credentials needed.
- 🛡️ **Anti-429 Multi-Client Engine** — Auto-routes through `android`, `ios`, and `mweb` player clients to eliminate YouTube bot-check rate limits.
- ⚡ **Event-Driven Terminal Progress Bar** — Interactive console progress bars in `setup.bat` during binary installations.

---

## 🚀 Quick Start (2 Steps)

### Step 1: One-Time Setup
> **Double-click `setup.bat`** (or Run as Administrator)

This automatically installs:
1. ✅ **Node.js** (if not already installed)
2. ✅ **yt-dlp** (latest build with Node JS challenge solver)
3. ✅ **FFmpeg** (static multi-core binaries)
4. ✅ **All application and worker dependencies**

A live progress bar will display in your terminal:
```
[======================== ] 96% (38.4 MB / 40.0 MB)
```
Wait for the **`SETUP COMPLETE! [OK]`** message.

---

### Step 2: Launch the App
> **Double-click `Pasooriizm.bat`**

- Clears any previous port collisions automatically.
- Launches the high-speed background worker and Next.js frontend.
- Opens your default web browser to **`http://localhost:3000`**.

---

## 🎵 How to Use

1. Open **Spotify** and find any playlist, album, or track.
2. Click **Share → Copy Link**.
3. Paste the URL into Pasooriizm and press **Download**.
4. Select your preferred format:
   - **`M4A (AAC)`** *(Recommended — ⚡ Ultra Fast)*: Direct 1:1 studio master stream pass-through.
   - **`MP3 (320kbps)`**: Maximum universal compatibility encoded with libmp3lame.
   - **`OPUS`**: Ultra-compact high-fidelity audio stream.
   - **`WAV`**: Uncompressed lossless audio.
5. Click **Download All** — watch the live ETA pill and song visualizer.
6. When finished, click **Save All Songs (ZIP)** to download a neatly organized, numbered archive.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│             Next.js 16 (App Router + Turbopack)        │
│                    http://localhost:3000               │
│                                                        │
│  • Zero-Credential Spotify Metadata Recursive Fetcher  │
│  • Pipelined Lookahead Pre-Search Queue Engine         │
│  • Sliding-Window EMA Runtime ETA Calculator           │
│  • In-Memory Client-Side ZIP Stream Packager           │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP JSON / Audio Stream
┌───────────────────────────▼────────────────────────────┐
│             Express TypeScript Backend Worker          │
│                    http://localhost:3001               │
│                                                        │
│  • In-Memory YouTube Search Engine (ytInitialData)     │
│  • Anti-429 Multi-Client Route Selector                │
│  • Unthrottled Node.js Player Signature Solver         │
│  • Direct Stream Pass-Through & Multi-Core Transcoder  │
│  • Immediate Temp File Unlinker & Lifecycle Sync       │
└────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
├── src/                              # Next.js Frontend
│   ├── app/
│   │   ├── page.tsx                  # Landing page & featured playlists
│   │   ├── download/[playlistId]/    # Interactive download dashboard & queue
│   │   └── api/spotify/              # Deep pagination Spotify metadata proxy
│   ├── components/                   # Live visualizer, ZipPackagingModal, QualitySelector, etc.
│   └── lib/                          # DownloadQueueManager, Spotify API utilities
├── worker/                           # Audio Processing Backend
│   ├── src/
│   │   ├── server.ts                 # Express worker entry point & routes
│   │   ├── routes/                   # /api/search, /api/download, /api/heartbeat
│   │   └── lib/
│   │       ├── audio-processor.ts    # yt-dlp + FFmpeg stream pipeline
│   │       └── youtube-search.ts     # In-memory HTTP YouTube result matcher
│   ├── bin/                          # yt-dlp & FFmpeg binaries (auto-managed)
│   └── package.json
├── setup.bat                         # Automated one-time setup script
├── Pasooriizm.bat                    # One-click application launcher
├── 10 songs per min.png              # Benchmark proof screenshot
└── README.md                         # Project documentation
```

---

## ⚖️ Legal & Compliance Disclaimer

This project is created for educational and personal offline backup purposes. It utilizes public Spotify metadata and streams audio via YouTube. It does not circumvent digital rights management (DRM) or extract encrypted Spotify streams. Users are responsible for complying with local copyright laws and third-party terms of service.
