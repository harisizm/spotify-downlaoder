import https from "https";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export interface SearchQuery {
  title: string;
  artist: string;
  album?: string;
  duration_ms?: number;
}

export interface SearchMatch {
  videoId: string;
  title: string;
  author: string;
  durationSeconds: number;
  score: number;
  candidates?: string[];
}

// In-memory cache for search results
const searchCache = new Map<string, SearchMatch>();
const MAX_CACHE_SIZE = 2000;

function getCacheKey(query: SearchQuery): string {
  return `${normalize(query.artist)}___${normalize(query.title)}`;
}

function normalize(str: string): string {
  return (str || "")
    .toLowerCase()
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDurationText(str: string): number {
  if (!str) return 0;
  const parts = str.split(":").map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function computeScore(
  query: SearchQuery,
  candidate: { title: string; author?: { name?: string }; seconds?: number }
): number {
  let score = 0;
  const qTitle = normalize(query.title);
  const qArtist = normalize(query.artist);
  const candTitle = normalize(candidate.title || "");
  const candAuthor = normalize(candidate.author?.name || "");
  const candSeconds = candidate.seconds || 0;

  // 1. Title match
  if (candTitle.includes(qTitle)) {
    score += 40;
  } else {
    const titleWords = qTitle.split(" ").filter((w) => w.length > 2);
    const matchedWords = titleWords.filter((w) => candTitle.includes(w));
    if (titleWords.length > 0) {
      score += (matchedWords.length / titleWords.length) * 30;
    }
  }

  // 2. Artist match
  if (candTitle.includes(qArtist) || candAuthor.includes(qArtist)) {
    score += 30;
  } else {
    const artistWords = qArtist.split(" ").filter((w) => w.length > 2);
    const matchedArtistWords = artistWords.filter((w) =>
      candTitle.includes(w) || candAuthor.includes(w)
    );
    if (artistWords.length > 0) {
      score += (matchedArtistWords.length / artistWords.length) * 20;
    }
  }

  // 3. Duration match (if provided)
  if (query.duration_ms && candSeconds > 0) {
    const expectedSec = query.duration_ms / 1000;
    const diff = Math.abs(candSeconds - expectedSec);

    if (diff <= 4) {
      score += 35;
    } else if (diff <= 10) {
      score += 20;
    } else if (diff <= 25) {
      score += 10;
    } else if (diff > 60) {
      score -= 40;
    }
  }

  // 4. Boost official uploads / audio / lyrics
  if (
    candTitle.includes("official video") ||
    candTitle.includes("official audio") ||
    candTitle.includes("music video") ||
    candTitle.includes("lyrics") ||
    candAuthor.includes("vevo") ||
    candAuthor.includes("topic")
  ) {
    score += 25;
  }

  // 5. Penalize live, instrumental, slowed, reverb if not in query
  const penalties = ["live", "instrumental", "karaoke", "8d", "slowed", "reverb", "cover", "remix"];
  for (const p of penalties) {
    if (!qTitle.includes(p) && candTitle.includes(p)) {
      score -= 30;
    }
  }

  return score;
}

/**
 * Direct in-memory HTTP search parsing YouTube results (0.5s - 1.2s response time)
 */
async function searchViaHttpDirect(queryStr: string): Promise<any[]> {
  return new Promise((resolve) => {
    const encoded = encodeURIComponent(queryStr);
    const url = `https://www.youtube.com/results?search_query=${encoded}`;

    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout: 6000,
      },
      (res) => {
        let html = "";
        res.on("data", (chunk) => (html += chunk));
        res.on("end", () => {
          try {
            const match =
              html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
              html.match(/ytInitialData\s*=\s*({.+?});/s);

            if (match && match[1]) {
              const data = JSON.parse(match[1]);
              const contents =
                data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
                  ?.contents;
              const items = contents?.[0]?.itemSectionRenderer?.contents || [];

              const results: any[] = [];
              for (const item of items) {
                const renderer = item.videoRenderer;
                if (
                  renderer &&
                  renderer.videoId &&
                  typeof renderer.videoId === "string" &&
                  /^[a-zA-Z0-9_-]{11}$/.test(renderer.videoId)
                ) {
                  const title =
                    renderer.title?.runs?.[0]?.text ||
                    renderer.title?.simpleText ||
                    "";
                  const durationText =
                    renderer.lengthText?.simpleText ||
                    renderer.lengthText?.runs?.[0]?.text ||
                    "0:00";
                  const author =
                    renderer.ownerText?.runs?.[0]?.text ||
                    renderer.shortBylineText?.runs?.[0]?.text ||
                    "YouTube";

                  results.push({
                    videoId: renderer.videoId,
                    title,
                    seconds: parseDurationText(durationText),
                    author: { name: author },
                  });
                }
              }

              if (results.length > 0) return resolve(results);
            }
          } catch {}
          resolve([]);
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      resolve([]);
    });

    req.on("error", () => resolve([]));
  });
}

/**
 * Determine executable path for yt-dlp
 */
function getYtDlpPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "worker", "bin", "yt-dlp.exe"),
    path.resolve(process.cwd(), "bin", "yt-dlp.exe"),
    path.resolve(process.cwd(), "worker", "bin", "yt-dlp"),
    path.resolve(process.cwd(), "bin", "yt-dlp"),
    "/usr/local/bin/yt-dlp",
    "/usr/bin/yt-dlp",
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
}

/**
 * Secondary fallback search using yt-dlp native search
 */
async function searchViaYtDlp(queryStr: string): Promise<any[]> {
  return new Promise((resolve) => {
    const ytDlpPath = getYtDlpPath();
    const args = [
      "--flat-playlist",
      "--no-warnings",
      "--no-playlist",
      "--print", "%(id)s\t%(title)s\t%(duration)s",
      `ytsearch3:${queryStr}`,
    ];

    try {
      const child = spawn(ytDlpPath, args);
      let output = "";

      child.stdout?.on("data", (d) => {
        output += d.toString();
      });

      const timer = setTimeout(() => {
        try { child.kill("SIGKILL"); } catch {}
        resolve([]);
      }, 10000);

      child.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0 || !output.trim()) {
          return resolve([]);
        }
        const lines = output.trim().split(/\r?\n/);
        const results = [];
        for (const line of lines) {
          const parts = line.split("\t");
          if (parts.length >= 2 && /^[a-zA-Z0-9_-]{11}$/.test(parts[0])) {
            results.push({
              videoId: parts[0],
              title: parts[1] || "",
              seconds: parseInt(parts[2] || "0", 10),
              author: { name: "YouTube" },
            });
          }
        }
        resolve(results);
      });

      child.on("error", () => {
        clearTimeout(timer);
        resolve([]);
      });
    } catch {
      resolve([]);
    }
  });
}

/**
 * Fast search dispatcher: checks Direct HTTP first, then yt-dlp fallback
 */
async function executeYtSearch(queryStr: string): Promise<any[]> {
  // Step 1: In-memory direct HTTP search (0.5s - 1.2s)
  const directResults = await searchViaHttpDirect(queryStr);
  if (directResults.length > 0) {
    return directResults;
  }

  // Step 2: Fallback to yt-dlp
  return await searchViaYtDlp(queryStr);
}

/**
 * Search YouTube with direct HTTP parser, score matching, and memory cache
 */
export async function searchYouTubeBestMatch(query: SearchQuery): Promise<SearchMatch | null> {
  if (!query.title && !query.artist) return null;

  const cacheKey = getCacheKey(query);
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const primaryQuery = `${query.artist} - ${query.title}`;
  const fallbackQuery = `${query.artist} ${query.title} audio`;

  try {
    const seenIds = new Set<string>();
    const allCandidates: any[] = [];

    // Attempt primary query
    const primaryVideos = await executeYtSearch(primaryQuery);
    for (const v of primaryVideos) {
      if (v?.videoId && /^[a-zA-Z0-9_-]{11}$/.test(v.videoId) && !seenIds.has(v.videoId)) {
        seenIds.add(v.videoId);
        allCandidates.push(v);
      }
    }

    // Check score
    let scored = allCandidates.map((v) => ({
      video: v,
      score: computeScore(query, v),
    }));
    scored.sort((a, b) => b.score - a.score);

    // If score < 50, try fallback query
    if (scored.length === 0 || scored[0].score < 50) {
      const fallbackVideos = await executeYtSearch(fallbackQuery);
      for (const v of fallbackVideos) {
        if (v?.videoId && /^[a-zA-Z0-9_-]{11}$/.test(v.videoId) && !seenIds.has(v.videoId)) {
          seenIds.add(v.videoId);
          allCandidates.push(v);
        }
      }

      scored = allCandidates.map((v) => ({
        video: v,
        score: computeScore(query, v),
      }));
      scored.sort((a, b) => b.score - a.score);
    }

    if (scored.length === 0) {
      return null;
    }

    const top = scored[0];
    const candidateIds = scored.slice(0, 5).map((s) => s.video.videoId);

    const matchResult: SearchMatch = {
      videoId: top.video.videoId,
      title: top.video.title || query.title,
      author: top.video.author?.name || "YouTube",
      durationSeconds: top.video.seconds || 0,
      score: top.score,
      candidates: candidateIds,
    };

    // Cache result
    if (searchCache.size >= MAX_CACHE_SIZE) {
      const firstKey = searchCache.keys().next().value;
      if (firstKey) searchCache.delete(firstKey);
    }
    searchCache.set(cacheKey, matchResult);

    return matchResult;
  } catch (error) {
    console.error("YouTube search error:", error);
    return null;
  }
}
