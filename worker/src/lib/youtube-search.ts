import ytSearch from "yt-search";

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

/**
 * Clean and normalize a string for fuzzy comparison
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compute similarity score between query and a YouTube candidate
 */
function computeScore(
  query: SearchQuery,
  candidate: { title: string; author: { name: string }; seconds: number }
): number {
  let score = 0;
  const qTitle = normalize(query.title);
  const qArtist = normalize(query.artist);
  const candTitle = normalize(candidate.title);
  const candAuthor = normalize(candidate.author?.name || "");

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

  // 2. Artist match (in title or channel name)
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
  if (query.duration_ms && candidate.seconds > 0) {
    const expectedSec = query.duration_ms / 1000;
    const diff = Math.abs(candidate.seconds - expectedSec);

    if (diff <= 4) {
      score += 35;
    } else if (diff <= 10) {
      score += 20;
    } else if (diff <= 25) {
      score += 10;
    } else if (diff > 60) {
      score -= 40; // heavy penalty for massive length differences (e.g. 1-hour loops or full albums)
    }
  }

  // 4. Boost official uploads / lyrics (DRM-free public streams)
  if (
    candTitle.includes("official video") ||
    candTitle.includes("official audio") ||
    candTitle.includes("music video") ||
    candTitle.includes("lyrics") ||
    candAuthor.includes("vevo")
  ) {
    score += 25;
  }

  // 5. Heavily penalize YouTube auto-generated "- Topic" channels (which use Widevine DRM encryption)
  if (candAuthor.includes("topic") || candTitle.includes("provided to youtube")) {
    score -= 60;
  }

  // 6. Penalize live, instrumental, 8d, slowed, reverb if not in query
  const penalties = ["live", "instrumental", "karaoke", "8d", "slowed", "reverb", "cover", "remix"];
  for (const p of penalties) {
    if (!qTitle.includes(p) && candTitle.includes(p)) {
      score -= 30;
    }
  }

  return score;
}

/**
 * Search YouTube using yt-search with scoring and DRM-safe selection
 */
export async function searchYouTubeBestMatch(query: SearchQuery): Promise<SearchMatch | null> {
  const searchQueries = [
    `${query.artist} ${query.title} official video`,
    `${query.artist} - ${query.title} audio`,
    `${query.artist} ${query.title} lyrics`,
    `${query.title} ${query.artist}`,
  ];

  try {
    const seenIds = new Set<string>();
    const allCandidates: any[] = [];

    for (const q of searchQueries) {
      try {
        const results = await ytSearch(q);
        if (results.videos && results.videos.length > 0) {
          for (const v of results.videos) {
            if (!seenIds.has(v.videoId)) {
              seenIds.add(v.videoId);
              allCandidates.push(v);
            }
          }
        }
      } catch {}
      if (allCandidates.length >= 8) break;
    }

    if (allCandidates.length === 0) {
      return null;
    }

    // Score all candidates
    const scored = allCandidates.map((v) => ({
      video: v,
      score: computeScore(query, v),
    }));

    // Sort by highest score first
    scored.sort((a, b) => b.score - a.score);

    const top = scored[0];
    const candidateIds = scored.slice(0, 5).map((s) => s.video.videoId);

    return {
      videoId: top.video.videoId,
      title: top.video.title,
      author: top.video.author?.name || "YouTube",
      durationSeconds: top.video.seconds,
      score: top.score,
      candidates: candidateIds,
    };
  } catch (error) {
    console.error("YouTube search error:", error);
    return null;
  }
}
