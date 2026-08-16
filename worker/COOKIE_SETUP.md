# YouTube Cookie Setup for Pasooriizm Worker

## Why Cookies Are Needed

YouTube blocks **all datacenter IP addresses** (Render, AWS, GCP, etc.) from downloading audio — no amount of user-agent spoofing or player_client tweaking can bypass this. The only proven solution is to authenticate with valid YouTube cookies from a real browser session.

## Setup Steps (5 minutes)

### Step 1: Install Cookie Export Extension

Install **"Get cookies.txt LOCALLY"** in Chrome or Edge:
- [Chrome Web Store Link](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)

### Step 2: Export YouTube Cookies

1. Open an **Incognito/Private** browser window
2. Go to [youtube.com](https://www.youtube.com) and **sign in** with any Google account
3. Click the **"Get cookies.txt LOCALLY"** extension icon
4. Click **"Export"** to download the cookies file
5. Save it as `cookies.txt` in the `worker/` folder of this project

### Step 3: Encode Cookies for Render

Run this command in the `worker/` folder:

```bash
node export-cookies.js
```

This will output a base64-encoded string.

### Step 4: Add to Render Environment

1. Go to [Render Dashboard](https://dashboard.render.com/) → your worker service
2. Click **Environment** in the left sidebar
3. Add a new environment variable:
   - **Key:** `YOUTUBE_COOKIES`
   - **Value:** *(paste the base64 string from Step 3)*
4. Click **Save Changes**

### Step 5: Deploy

Click **Manual Deploy** → **Deploy latest commit**

## How It Works

- The worker reads `YOUTUBE_COOKIES` env var at startup
- Decodes it from base64 and writes a temporary cookie file
- Passes `--cookies /tmp/yt_cookies.txt` to every `yt-dlp` invocation
- YouTube sees the request as coming from an authenticated user, bypassing bot detection

## Cookie Refresh

YouTube cookies expire after some time. If downloads start failing again:
1. Repeat Steps 2-5 with fresh cookies
2. Use a dedicated/throwaway Google account for this purpose

## Security Note

- The cookies are stored as an environment variable on Render (encrypted at rest)
- They are never committed to git or exposed to the frontend
- Use a **secondary Google account** — not your primary one
