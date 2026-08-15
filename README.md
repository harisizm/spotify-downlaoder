# Pasooriizm | Spotify Playlist Downloader
*Built by **[harisizm](https://www.linkedin.com/in/harisizm/)***

Pasooriizm is a web application to download Spotify playlists, albums, and tracks in high quality (up to 320kbps MP3/WAV) without song limits.

---

## ⚡ Key Features

- **Full Playlist Downloads**: No 100-song limit. Download playlists with hundreds or thousands of tracks with complete pagination.
- **High Quality Audio**: Supports 128kbps, 192kbps, 256kbps, and 320kbps in MP3, M4A, OPUS, and WAV.
- **Fast Batch Downloads**: Parallel downloader processes multiple songs simultaneously.
- **Automatic ZIP Packaging**: Bundles your songs into a cleanly organized, numbered ZIP file on your device.
- **Pakistani & Viral Charts Sampler**: 1-click sampler featuring top Pakistani and viral hits with swipe/drag navigation.
- **Hybrid Architecture**: Fast Next.js frontend deployable for 100% free on Vercel with a lightweight Dockerized worker backend for Render or Railway.
- **Spotify Design System**: Custom glassmorphism UI with vibrant green accents, dark mode styling, and smooth micro-animations.

---

## 📁 Repository Structure

```
├── src/                              # Next.js 15 App Router Frontend
│   ├── app/
│   │   ├── page.tsx                  # Landing page (hero, URL input, feature showcase)
│   │   ├── dashboard/page.tsx        # User playlist dashboard
│   │   ├── download/[playlistId]/    # Download manager, search, filter & ZIP bundler
│   │   ├── callback/page.tsx         # OAuth callback handler
│   │   ├── api/spotify/
│   │   │   ├── playlist/[id]/        # Universal metadata resolver (zero-config & official API)
│   │   │   └── token/                # PKCE token exchange proxy
│   │   └── globals.css               # Spotify design tokens & animations
│   ├── components/                   # Navbar, TrackRow, ProgressBar, QualitySelector, etc.
│   └── lib/                          # Spotify API client, PKCE auth, download queue manager
├── worker/                           # Dockerized audio processing backend
│   ├── src/
│   │   ├── server.ts                 # Express server with CORS & rate limiter
│   │   ├── routes/                   # /api/search, /api/download, /api/batch
│   │   └── lib/                      # yt-dlp & ffmpeg-static audio processor
│   ├── Dockerfile                    # Debian slim + ffmpeg + yt-dlp container
│   └── package.json
├── public/                           # Static assets & icons
├── next.config.ts                    # Next.js configuration
├── package.json                      # Frontend dependencies
├── .env.example                      # Frontend environment template
└── .gitignore                        # Production deployment gitignore
```

---

## 🚀 Getting Started Locally

### 1. Start the Frontend (Next.js)
```bash
npm install
npm run dev
```
The frontend will run at `http://localhost:3000`.

### 2. Start the Download Worker (Backend)
```bash
cd worker
npm install
npm run dev
```
The worker service will listen on `http://localhost:3001`.

---

## 🌐 100% Free Production Deployment Guide

### Part 1: Deploy Backend Worker (Render or Koyeb — Free)
1. Go to [Render](https://render.com) and click **New > Web Service**.
2. Connect your GitHub repository (`https://github.com/harisizm/spotify-downlaoder.git`).
3. Configure the service:
   - **Root Directory**: `worker`
   - **Environment**: `Docker` (Render will automatically detect `worker/Dockerfile`)
   - **Plan**: **Free**
4. Under **Environment Variables**, add:
   - `PORT`: `3001`
   - `ALLOWED_ORIGINS`: `https://your-frontend.vercel.app` (or `*` temporarily)
5. Click **Create Web Service**. Once deployed, copy your worker URL (e.g. `https://spotdown-worker.onrender.com`).

### Part 2: Deploy Frontend (Vercel — Free)
1. Go to [Vercel](https://vercel.com) and click **Add New > Project**.
2. Import your GitHub repository (`spotify-downlaoder`).
3. Framework Preset: **Next.js** (Root Directory: `./`).
4. In **Environment Variables**, add:
   - `NEXT_PUBLIC_WORKER_API_URL`: Your Render worker URL (e.g. `https://spotdown-worker.onrender.com`)
   - `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`: Your Spotify Developer Client ID (optional)
   - `SPOTIFY_CLIENT_SECRET`: Your Spotify Developer Client Secret (optional)
   - `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI`: `https://your-app.vercel.app/callback`
5. Click **Deploy**. Your app is live!

---

## ⚖️ Legal & Compliance Disclaimer

This software uses the Spotify Web API / Embed metadata for song information and downloads audio from YouTube. It does not circumvent digital rights management (DRM) or access encrypted Spotify audio streams. Users are responsible for adhering to local copyright laws and third-party platform terms of service.
