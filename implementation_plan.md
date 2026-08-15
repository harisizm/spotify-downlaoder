# Spotify Playlist Bulk Downloader — Implementation Plan

## Problem Statement

Existing Spotify download tools suffer from four critical problems:
1. **Low quality** — locked at ~128kbps with no quality selection
2. **Playlist cap** — limited to the first 100 songs; playlists with 500–1000+ songs are unsupported
3. **Slow downloads** — sequential, single-threaded processing
4. **Costly** — paid tools or require a paid VPS

We are building a **web-based tool** that solves all four, with a premium Spotify-themed UI, deployable for free.

---

## How It Actually Works (The Pipeline)

> [!IMPORTANT]
> Spotify does **not** allow direct audio downloads. The industry-standard approach (used by spotDL, etc.) is:
> 1. Use the **Spotify API** to get playlist metadata (track name, artist, album, art)
> 2. **Search YouTube/YouTube Music** for the matching audio
> 3. **Download the audio** from YouTube at the desired quality
> 4. **Tag the file** with Spotify metadata (artist, album, cover art)

This is exactly what we will implement — but as a web app with a split architecture.

---

## Architecture Decision: Split Deployment

> [!WARNING]  
> **Vercel cannot run `yt-dlp` or `ffmpeg`**. Serverless functions have a 10s timeout (free plan), read-only filesystems, and 250MB bundle limits. Video/audio processing is fundamentally incompatible with serverless.

### The Solution: Hybrid Architecture

| Layer | Platform | Role |
|-------|----------|------|
| **Frontend + API Gateway** | **Vercel** (free) | Next.js app — UI, Spotify OAuth, playlist fetching, download orchestration |
| **Download Worker API** | **Railway** (free $5 credit) or **Render** (free tier) | Dockerized Node.js service with `yt-dlp` + `ffmpeg` — handles actual audio downloading & conversion |

```
┌─────────────────────────────────────────────────────┐
│                   USER'S BROWSER                     │
│                                                      │
│  ┌──────────────┐   ┌────────────────────────────┐  │
│  │ Spotify OAuth │   │  Download Queue Manager    │  │
│  │ (PKCE Flow)  │   │  (Web Worker Pool)         │  │
│  └──────┬───────┘   └───────────┬────────────────┘  │
│         │                       │                    │
│         │ Access Token          │ Parallel requests  │
└─────────┼───────────────────────┼────────────────────┘
          │                       │
          ▼                       ▼
┌─────────────────┐    ┌──────────────────────┐
│   VERCEL (Free) │    │  RAILWAY / RENDER     │
│                 │    │  (Free Tier)          │
│  Next.js App    │    │                       │
│  ┌───────────┐  │    │  Docker Container     │
│  │ /api/     │  │    │  ┌─────────────────┐  │
│  │ spotify   │──┼────┤  │ Express API     │  │
│  │ proxy     │  │    │  │                 │  │
│  └───────────┘  │    │  │ yt-dlp + ffmpeg │  │
│                 │    │  │                 │  │
│  Static Assets  │    │  │ Search YouTube  │  │
│  UI Components  │    │  │ Download Audio  │  │
│                 │    │  │ Convert Format  │  │
│                 │    │  │ Stream to User  │  │
└─────────────────┘    │  └─────────────────┘  │
                       └──────────────────────┘
```

---

## User Review Required

> [!IMPORTANT]
> **Spotify Developer App Required**: You will need to create a free app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) to get a Client ID. This is free and takes ~2 minutes.

> [!WARNING]
> **Backend Host Choice**: The download worker **cannot** run on Vercel. We need either:
> - **Railway** — $5 free credit/month, Docker support, best DX → **Recommended**
> - **Render** — 750 free hours/month, but 0.1 CPU + 512MB RAM + spins down after 15 min
> - **Self-hosted VPS** — Most reliable but not free
>
> Which platform do you prefer for the download worker backend?

> [!IMPORTANT]
> **Legal Disclaimer**: This tool uses Spotify's API only for metadata and downloads audio from YouTube. It does not bypass Spotify's DRM. Users should ensure compliance with local copyright laws and platform ToS.

---

## Open Questions

1. **Backend host preference?** Railway (recommended) vs Render vs other?
2. **Do you want a self-hosted Cobalt instance as the download engine** (simpler API, but adds another service to maintain) **or a direct `yt-dlp` integration** (more control, single container)?
3. **Authentication**: Should the tool require Spotify login (gets user's private playlists too) or should it also support pasting any public playlist URL without login?
4. **Will you provide the Spotify design language `.md` file** before we start implementation, or should we begin with the standard Spotify color palette (black, green #1DB954, dark grays) and refine later?
5. **Batch download format**: Individual MP3 files auto-zipped, or individual file downloads with a "download all as ZIP" option?

---

## Proposed Tech Stack

### Frontend (Vercel — Next.js)

| Technology | Purpose |
|-----------|---------|
| **Next.js 15** (App Router) | Framework — SSR, API routes, Edge functions |
| **React 19** | UI library |
| **TypeScript** | Type safety |
| **Vanilla CSS** (CSS Modules) | Styling — Spotify design language, animations |
| **Google Fonts (Circular/Inter)** | Typography matching Spotify's aesthetic |
| **Spotify Web API** | Playlist metadata extraction |
| **PKCE OAuth Flow** | User auth without exposing secrets |
| **Web Workers** | Parallel download queue management |
| **client-zip** | Client-side ZIP generation for bulk downloads |
| **Framer Motion** | Smooth animations and transitions |

### Backend Worker (Railway — Docker)

| Technology | Purpose |
|-----------|---------|
| **Node.js 20** + **Express** | Lightweight API server |
| **yt-dlp** (binary) | YouTube audio extraction |
| **ffmpeg** (binary) | Audio format conversion & metadata embedding |
| **Invidious/Piped API** | YouTube search (no API key needed) |
| **TypeScript** | Type safety |
| **CORS middleware** | Accept requests from Vercel frontend |
| **Rate limiting** | Prevent abuse |
| **Streaming responses** | Stream audio directly to browser (no temp storage needed) |

---

## Proposed Changes

### Component 1: Frontend (Next.js on Vercel)

#### [NEW] Project initialization & config

- `next.config.ts` — Next.js configuration with environment variables
- `package.json` — Dependencies
- `tsconfig.json` — TypeScript config
- `.env.local` — Spotify Client ID, Worker API URL
- `.env.example` — Template for env vars

#### [NEW] Spotify OAuth Module — `src/lib/spotify-auth.ts`
- PKCE flow implementation (code verifier/challenge generation)
- Token management (access token, refresh token, expiry)
- No client secret needed — purely frontend PKCE

#### [NEW] Spotify API Client — `src/lib/spotify-api.ts`
- `getPlaylistTracks(playlistId, accessToken)` — Paginated fetching of ALL tracks (no 100-song limit)
- Uses `next` cursor from API response to paginate through entire playlist
- `getPlaylistInfo(playlistId)` — Playlist metadata (name, cover, owner)
- `parseSpotifyUrl(url)` — Extract playlist/track/album ID from any Spotify URL format
- Rate limit handling with exponential backoff

#### [NEW] Download Queue Manager — `src/lib/download-queue.ts`
- Concurrent download pool (configurable, default 3-5 parallel)
- Per-track status tracking (queued → searching → downloading → converting → done → error)
- Retry logic with exponential backoff
- Progress events via EventEmitter pattern
- Pause/Resume/Cancel capabilities

#### [NEW] Layout & Global Styles — `src/app/layout.tsx`, `src/app/globals.css`
- Spotify design language: Dark theme (#121212 background, #1DB954 green accents)
- Custom CSS properties for the entire design system
- Google Fonts loading (Inter/Circular alternative)
- Global animations and transitions

#### [NEW] Landing Page — `src/app/page.tsx`
- Hero section with animated gradient
- URL paste input with smart detection (playlist/album/track)
- "Connect with Spotify" CTA button
- Feature highlights (unlimited songs, quality selection, fast)
- Glassmorphism card effects

#### [NEW] Auth Callback Page — `src/app/callback/page.tsx`
- Handles Spotify OAuth redirect
- Exchanges code for tokens
- Redirects to dashboard

#### [NEW] Dashboard Page — `src/app/dashboard/page.tsx`
- Shows connected Spotify account info
- Playlist URL input
- User's own playlists browser (optional)

#### [NEW] Download Page — `src/app/download/[playlistId]/page.tsx`
- Playlist header (cover art, name, song count, total duration)
- Quality selector dropdown (128kbps / 192kbps / 256kbps / 320kbps)
- Format selector (MP3 / M4A / OPUS / WAV)
- Track list with individual status indicators
- Global progress bar with ETA
- "Download All as ZIP" / "Download Individual" toggle
- Animated progress per track (searching → downloading → converting → done)
- Select/deselect individual tracks

#### [NEW] UI Components — `src/components/`
- `SpotifyButton.tsx` — Branded button component
- `TrackRow.tsx` — Individual track with status, progress, actions
- `ProgressBar.tsx` — Animated progress indicator
- `QualitySelector.tsx` — Audio quality picker
- `PlaylistHeader.tsx` — Playlist metadata display
- `Navbar.tsx` — App navigation
- `Toast.tsx` — Notification system

#### [NEW] API Routes — `src/app/api/`
- `src/app/api/spotify/token/route.ts` — Token exchange proxy (keeps client secret secure)
- `src/app/api/health/route.ts` — Health check for the worker service

---

### Component 2: Download Worker Backend (Railway/Docker)

#### [NEW] Docker setup
- `worker/Dockerfile` — Node.js 20 + yt-dlp + ffmpeg + Deno (for yt-dlp JS challenges)
- `worker/package.json` — Express, cors, helmet, rate-limit
- `worker/.env.example` — Configuration template

#### [NEW] API Server — `worker/src/server.ts`
- Express server with CORS, helmet, rate limiting
- Health check endpoint
- Graceful shutdown handling

#### [NEW] Search Endpoint — `worker/src/routes/search.ts`
- `POST /api/search` — Accepts `{ title, artist, album, duration_ms }`
- Searches YouTube via Invidious/Piped API (no API key needed)
- Returns best match with confidence score
- Matching algorithm considers: title similarity, artist match, duration proximity (±5s)

#### [NEW] Download Endpoint — `worker/src/routes/download.ts`
- `GET /api/download` — Accepts `{ youtubeId, format, quality }`
- Spawns `yt-dlp` process to extract audio
- Pipes through `ffmpeg` for format conversion
- **Streams response directly** to browser (no temp files, no storage needed)
- Sets proper headers for browser download (`Content-Disposition`, `Content-Type`)

#### [NEW] Batch Endpoint — `worker/src/routes/batch.ts`
- `POST /api/batch/search` — Accepts array of tracks, returns all matches
- Server-side parallel search for faster playlist resolution

#### [NEW] YouTube Search Module — `worker/src/lib/youtube-search.ts`
- Queries multiple Invidious/Piped instances for redundancy
- Falls back between instances if one is down
- Fuzzy string matching for song title/artist
- Duration comparison to filter bad matches

#### [NEW] Audio Processing Module — `worker/src/lib/audio-processor.ts`
- `yt-dlp` wrapper for audio extraction
- `ffmpeg` wrapper for conversion and metadata embedding
- Supports: MP3 (128–320kbps), M4A/AAC, OPUS, WAV
- Embeds Spotify metadata: title, artist, album, year, cover art

---

## How Each Problem Is Solved

### Problem 1: Low Quality → **User-Selectable Quality**
- Quality selector: 128 / 192 / 256 / 320 kbps
- Format selector: MP3, M4A, OPUS, WAV
- `yt-dlp` fetches the best available YouTube audio stream
- `ffmpeg` converts to the exact requested format and bitrate

### Problem 2: 100-Song Limit → **Full Pagination**
- Spotify API returns max 100 tracks per request
- We follow the `next` cursor and paginate through ALL tracks
- A playlist with 1000 songs = 10 API calls, all automated
- No artificial limit — fetches every last track

### Problem 3: Slow → **Parallel Download Pipeline**
- Web Worker pool manages concurrent downloads (3–5 parallel)
- Each track goes through an async pipeline: Search → Download → Convert → Deliver
- Streaming responses — audio starts delivering to browser before conversion finishes
- Batch search endpoint resolves all YouTube matches server-side in parallel

### Problem 4: Costly → **Free Deployment**
- Frontend: **Vercel free tier** (unlimited for hobby projects)
- Backend: **Railway free tier** ($5/month credit) or **Render free** (750 hrs/month)
- No paid APIs: Spotify API is free, YouTube search via Invidious/Piped is free
- No storage needed: Audio is streamed directly, never stored on server

---

## Deployment Guide

### Vercel (Frontend)
```bash
# 1. Push to GitHub
# 2. Connect repo to Vercel
# 3. Set environment variables:
#    NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id
#    SPOTIFY_CLIENT_SECRET=your_client_secret
#    NEXT_PUBLIC_WORKER_API_URL=https://your-worker.railway.app
# 4. Deploy automatically
```

### Railway (Backend Worker)
```bash
# 1. Create new Railway project
# 2. Deploy from GitHub (point to /worker directory)
# 3. Railway auto-detects Dockerfile
# 4. Set environment variables:
#    ALLOWED_ORIGINS=https://your-app.vercel.app
#    RATE_LIMIT_MAX=100
# 5. Deploy automatically
```

---

## File Structure Overview

```
spotify-downloader/
├── src/                          # Next.js frontend
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing page
│   │   ├── globals.css           # Spotify design system
│   │   ├── callback/
│   │   │   └── page.tsx          # OAuth callback
│   │   ├── dashboard/
│   │   │   └── page.tsx          # User dashboard
│   │   ├── download/
│   │   │   └── [playlistId]/
│   │   │       └── page.tsx      # Download page
│   │   └── api/
│   │       └── spotify/
│   │           └── token/
│   │               └── route.ts  # Token exchange
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── TrackRow.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── QualitySelector.tsx
│   │   ├── PlaylistHeader.tsx
│   │   └── SpotifyButton.tsx
│   └── lib/
│       ├── spotify-auth.ts
│       ├── spotify-api.ts
│       └── download-queue.ts
├── worker/                       # Backend download service
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.ts
│       ├── routes/
│       │   ├── search.ts
│       │   ├── download.ts
│       │   └── batch.ts
│       └── lib/
│           ├── youtube-search.ts
│           └── audio-processor.ts
├── public/                       # Static assets
├── next.config.ts
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Verification Plan

### Automated Tests
- Unit tests for Spotify URL parser (track, album, playlist, with/without query params)
- Unit tests for YouTube search matching algorithm
- Unit tests for download queue state machine
- Integration test: Spotify API pagination (mock 200+ track playlist)

### Manual Verification
- Test with a small playlist (5 songs) — verify all tracks download correctly
- Test with a large playlist (200+ songs) — verify pagination and progress tracking
- Test quality selector — verify output bitrate matches selection
- Test on Vercel preview deployment
- Test worker on Railway free tier
- Browser testing: Chrome, Firefox, Safari

### Commands
```bash
# Frontend
npm run dev          # Local development
npm run build        # Production build check
npm run lint         # Linting

# Worker
cd worker
npm run dev          # Local worker development
docker build -t worker . # Docker build test
```

---

## Implementation Order

1. **Phase 1**: Next.js project setup + Spotify OAuth + Playlist fetching (frontend only)
2. **Phase 2**: Download worker backend (Docker + yt-dlp + ffmpeg + Express API)
3. **Phase 3**: Frontend download UI + queue manager + progress tracking
4. **Phase 4**: ZIP bundling + metadata embedding + polish
5. **Phase 5**: Deployment (Vercel + Railway) + testing

> [!TIP]
> We should implement and test Phase 1 first — getting Spotify auth and playlist metadata working — before building the download backend. This lets you verify the Spotify API integration independently.
