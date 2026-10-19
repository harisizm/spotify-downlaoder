# Is Pasooriizm worth a LinkedIn post / a CV slot?

## LinkedIn post: yes, clearly

It fits the pattern of your three strongest posts (TransGPA, UOL timetable, Instagram Lead Generator): a problem the reader has personally felt, an honest account of why it's messier than it looks, and a working thing at the end. The "I have a job and still built this because I needed it" angle is the hook, and the comparison against capped, ad-filled, 128kbps scrapers gives it a villain. Your Instagram reel already got 30 likes / 9 comments from a smaller audience, so the demand signal is there.

One caution: this is a grey-area tool and your LinkedIn shows your employer. The post keeps the README's framing (personal offline backup, public metadata, no DRM circumvention) in one plain sentence. Keep that sentence; don't let it grow into a paragraph of disclaimers either.

## CV: add it, but not in place of anything you have now

Your current CV already has five projects. Ranked by what they prove to a hiring manager:

| Project | What it proves | Keep? |
|---|---|---|
| Tourgenz | Production system, payments, auth, 2,000 tests, 111 migrations | Keep, it's the headline |
| Instagram Lead Generator | Scale (10k/day), proxies, resilience, VPS ops | Keep |
| Upwork Job Intelligence | Reverse-engineered GraphQL, Cloudflare bypass, LLM pipeline | Keep |
| TransGPA | Real users (100+), privacy-first, client-side parsing | Keep, it's the only one with a user count |
| Khilariverse | MERN CRUD store | **Weakest.** Role-based admin + Cloudinary is table stakes in 2026 |

Pasooriizm is stronger than Khilariverse on every axis that matters: it has a measured benchmark (10+ songs/min, 324 tracks in ~25 min), a non-trivial concurrency design (queue + lookahead pre-search + multi-client fallback), a native binary pipeline (yt-dlp, FFmpeg), and it was built unprompted while employed, which reads as initiative.

But replacing Khilariverse is not obviously right either. The CV is already heavy on automation/scraping (three of five projects). Khilariverse is your only e-commerce / MERN / MongoDB line, and MongoDB otherwise appears nowhere except the skills list. If a role lists MongoDB or e-commerce, that line earns its place.

**Recommendation:** swap in Pasooriizm for Khilariverse on the version you send to backend / Node / platform roles. Keep Khilariverse on the version for generalist full-stack or MERN-specific roles. If you only keep one CV, replace Khilariverse; the engineering story in Pasooriizm is better and you can cover MongoDB in the skills line.

## Suggested CV entry (same format as your others)

**Pasooriizm: Uncapped Spotify Playlist Downloader** *(view source code)*
Tech Stack: Next.js 16, React 19, TypeScript, Express.js, yt-dlp, FFmpeg, Framer Motion

• Built a desktop web app that downloads full Spotify playlists with no track limit by recursively paginating past the API's 100-track ceiling with no account or API keys, benchmarked at 10+ songs/minute (a 324-track playlist in ~25 minutes).
• Designed a resilient download queue with 5-way parallelism, lookahead pre-search of the next 6–10 tracks, per-track retry, pause/resume, and partial-save, plus a multi-client (android/ios/mweb) fallback that routes around YouTube 429 rate limits.
• Implemented a native 1:1 M4A/AAC and OPUS stream pass-through (zero re-encoding) alongside multi-core 320kbps MP3 transcoding, a sliding-window EMA ETA, and an in-browser ZIP packager; shipped a one-click Windows installer (setup.bat) that provisions Node.js, yt-dlp and FFmpeg for non-technical users.

Three bullets like your other entries. Drop the third if you need the space; the first two carry the story.
