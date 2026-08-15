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
    // Check partial words
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

    if (diff <= 3) {
      score += 30;
    } else if (diff <= 8) {
      score += 20;
    } else if (diff <= 15) {
      score += 10;
    } else if (diff > 60) {
      score -= 30; // heavy penalty for massive length differences (e.g. 1-hour loops or full albums)
    }
  }

  // 4. Boost official audio / topic tracks
  if (candTitle.includes("official audio") || candTitle.includes("audio") || candAuthor.includes("topic")) {
    score += 10;
  }

  // 5. Penalize live, instrumental, 8d, slowed, reverb if not in query
  const penalties = ["live", "instrumental", "karaoke", "8d", "slowed", "reverb", "cover"];
  for (const p of penalties) {
    if (!qTitle.includes(p) && candTitle.includes(p)) {
      score -= 25;
    }
  }

  return score;
}

/**
 * Search YouTube using yt-search with scoring and fallback
 */
export async function searchYouTubeBestMatch(query: SearchQuery): Promise<SearchMatch | null> {
  const searchQueries = [
    `${query.artist} - ${query.title} audio`,
    `${query.artist} ${query.title}`,
    `${query.title} ${query.artist} official`,
    `${query.title} audio`,
  ];

  try {
    let videos: any[] = [];
    for (const q of searchQueries) {
      const results = await ytSearch(q);
      if (results.videos && results.videos.length > 0) {
        videos = results.videos;
        break;
      }
    }

    if (videos.length === 0) {
      return null;
    }

    // Score candidates and pick highest
    let bestMatch: SearchMatch | null = null;
    let highestScore = -Infinity;

    for (const v of videos.slice(0, 10)) {
      const score = computeScore(query, v);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          videoId: v.videoId,
          title: v.title,
          author: v.author?.name || "YouTube",
          durationSeconds: v.seconds,
          score,
        };
      }
    }

    // If for some reason score was too low, fallback to first video
    if (!bestMatch && videos.length > 0) {
      const top = videos[0];
      bestMatch = {
        videoId: top.videoId,
        title: top.title,
        author: top.author?.name || "YouTube",
        durationSeconds: top.seconds,
        score: 10,
      };
    }

    return bestMatch;
  } catch (error) {
    console.error("YouTube search error:", error);
    return null;
  }
}
