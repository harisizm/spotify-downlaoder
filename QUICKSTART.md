# SpotDown — Quick Setup & Deployment Guide

Welcome to **SpotDown**, a modern, high-speed Spotify Playlist & Music Bulk Downloader built with Next.js 15 and a Dockerized audio processing backend.

---

## 1. Quick Start Locally (2 Steps)

### Step 1: Start the Frontend (Next.js)
```bash
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### Step 2: Start the Download Worker Backend
```bash
cd worker
npm install
npm run dev
```
The worker API runs at **`http://localhost:3001`**.

---

## 2. Zero Configuration vs Developer Keys

* **Zero-Config Mode**: Download public tracks, albums, and playlists up to 100 songs without any keys.
* **Full Developer API Mode (No 100-song cap)**:
  1. Open [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create a free app with redirect URI: `http://localhost:3000/callback` (or your Vercel URL `/callback`).
  2. Add your `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` into `.env.local`.
  3. Restart Next.js dev server to paginate through playlists of any size (127, 500+ songs).

---

## 3. Free Deployment Architecture

| Component | Platform | Cost | Configuration |
| :--- | :--- | :--- | :--- |
| **Frontend** | [Vercel](https://vercel.com) | Free ($0) | Root: `./`, Framework: Next.js |
| **Worker API** | [Render](https://render.com) | Free ($0) | Root: `worker`, Environment: `Docker` |
