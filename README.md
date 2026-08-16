# Pasooriizm — Spotify Playlist Downloader
*Built by **[harisizm](https://www.linkedin.com/in/harisizm/)***

A local desktop application to download entire Spotify playlists, albums, and tracks in high quality audio (up to 320kbps MP3/WAV) — no song limits, no account required.

---

## ⚡ Key Features

- **Full Playlist Downloads** — No 100-song limit. Handles playlists with hundreds or thousands of tracks.
- **High Quality Audio** — 128 / 192 / 256 / 320 kbps in MP3, M4A, OPUS, and WAV.
- **Fast Parallel Downloads** — Processes multiple songs simultaneously.
- **Automatic ZIP Packaging** — Bundles songs into a cleanly organized, numbered ZIP file.
- **Pakistani & Viral Charts Sampler** — 1-click sampler with swipeable navigation.
- **Smart YouTube Matching** — Scores and ranks YouTube results by title, artist, and duration to find the best audio match. Avoids DRM-protected auto-generated Topic channels.
- **Spotify Design System** — Glassmorphism UI with vibrant green accents, dark mode, and smooth micro-animations.

---

## 🚀 Quick Start (Local)

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **npm** | 9+ | Comes with Node.js |

### 1. Clone & Install

```bash
git clone https://github.com/harisizm/spotify-downlaoder.git
cd spotify-downlaoder
npm install
cd worker && npm install && cd ..
```

### 2. Start Both Servers

Open **two terminals**:

**Terminal 1 — Frontend** (Next.js at http://localhost:3000):
```bash
npm run dev
```

**Terminal 2 — Worker Backend** (Express at http://localhost:3001):
```bash
cd worker
npm run dev
```

### 3. Use the App

1. Open **http://localhost:3000** in your browser
2. Paste any Spotify playlist, album, or track URL
3. Select your tracks, choose format & quality
4. Click **Download** — songs are extracted, converted, and saved locally

---

## 📁 Project Structure

```
├── src/                              # Next.js 15 App Router Frontend
│   ├── app/
│   │   ├── page.tsx                  # Landing page (hero, URL input, feature showcase)
│   │   ├── dashboard/page.tsx        # User playlist dashboard
│   │   ├── download/[playlistId]/    # Download manager with search, filter & ZIP bundler
│   │   ├── callback/page.tsx         # OAuth callback handler
│   │   ├── stats/page.tsx            # Anonymous admin telemetry dashboard
│   │   ├── api/spotify/              # Spotify metadata API routes
│   │   │   ├── playlist/[id]/        # Universal metadata resolver (zero-config & official API)
│   │   │   └── token/                # PKCE token exchange proxy
│   │   ├── api/stats/                # MongoDB telemetry API (GET/POST/DELETE)
│   │   ├── api/admin/auth/           # Admin authentication endpoint
│   │   └── globals.css               # Spotify design tokens & animations
│   ├── components/                   # Navbar, TrackRow, ProgressBar, QualitySelector, etc.
│   └── lib/                          # Spotify API client, PKCE auth, download queue manager
├── worker/                           # Audio processing backend
│   ├── src/
│   │   ├── server.ts                 # Express server with CORS & rate limiter
│   │   ├── routes/                   # /api/search, /api/download, /api/batch
│   │   └── lib/
│   │       ├── audio-processor.ts    # yt-dlp + ffmpeg audio extraction & streaming
│   │       └── youtube-search.ts     # Smart YouTube matching with DRM-safe scoring
│   ├── bin/                          # yt-dlp binary (auto-downloaded, gitignored)
│   ├── Dockerfile                    # Container config (for optional cloud deploy)
│   └── package.json
├── public/                           # Static assets & icons
├── .env.local                        # Environment configuration (gitignored)
├── .env.example                      # Environment template
├── next.config.ts                    # Next.js configuration
└── package.json                      # Frontend dependencies
```

---

## ⚙️ Configuration

Copy `.env.example` to `.env.local` and fill in:

```env
# Spotify Developer Credentials (OPTIONAL — app works in zero-config mode without these)
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback

# Worker API URL (default for local)
NEXT_PUBLIC_WORKER_API_URL=http://localhost:3001

# Admin Dashboard (optional)
ADMIN_PASSWORD=admin
NEXT_PUBLIC_ADMIN_USER=admin

# MongoDB Telemetry (optional)
MONGODB_URI=your_mongodb_connection_string
```

> **Note:** The app works without any Spotify credentials. It uses a zero-config metadata resolver that fetches playlist info from Spotify's public embed API.

---

## 🏗️ How It Works

```
┌─────────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│  Next.js Frontend   │────▶│  Worker Backend      │────▶│   YouTube    │
│  (localhost:3000)    │     │  (localhost:3001)     │     │   (audio)    │
│                     │     │                      │     │              │
│  • Spotify metadata │     │  • YouTube search    │     │  • yt-dlp    │
│  • Download queue   │     │  • yt-dlp + ffmpeg   │     │  • ffmpeg    │
│  • ZIP bundler      │     │  • Audio streaming   │     │  • Convert   │
└─────────────────────┘     └─────────────────────┘     └──────────────┘
```

1. **Frontend** fetches playlist metadata from Spotify's public embed API
2. **Worker** searches YouTube for each track using smart scoring (title + artist + duration match)
3. **Worker** downloads audio via `yt-dlp`, converts with `ffmpeg`, and streams the file back
4. **Frontend** receives audio blobs, tracks progress, and bundles everything into a ZIP

---

## ⚠️ Cloud Deployment Note

This app is designed to run **locally**. YouTube aggressively blocks all datacenter IP addresses (Render, AWS, GCP, Vercel, etc.) from downloading audio — this is an IP-level block that cannot be bypassed with code. Running locally uses your home/residential IP, which YouTube treats as a normal user.

---

## ⚖️ Legal & Compliance Disclaimer

This software uses the Spotify Web API / Embed metadata for song information and downloads audio from YouTube. It does not circumvent digital rights management (DRM) or access encrypted Spotify audio streams. Users are responsible for adhering to local copyright laws and third-party platform terms of service.
