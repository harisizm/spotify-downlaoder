/**
 * Spotify Types & Utilities
 *
 * URL parsing, formatting, and type definitions.
 * All actual API calls go through the server-side API route at /api/spotify/playlist/[id].
 */

/* ========== URL Parsing ========== */

export type SpotifyContentType = "track" | "album" | "playlist";

export interface ParsedSpotifyUrl {
  type: SpotifyContentType;
  id: string;
}

/**
 * Parse any Spotify URL or URI format into { type, id }.
 *
 * Supports:
 *   - https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
 *   - https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc123
 *   - spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
 *   - Just the ID: 37i9dQZF1DXcBWIGoYBM5M (assumes playlist)
 */
export function parseSpotifyUrl(input: string): ParsedSpotifyUrl | null {
  const trimmed = input.trim();

  // Spotify URI format: spotify:playlist:ID
  const uriMatch = trimmed.match(
    /^spotify:(track|album|playlist):([a-zA-Z0-9]+)$/
  );
  if (uriMatch) {
    return { type: uriMatch[1] as SpotifyContentType, id: uriMatch[2] };
  }

  // Web URL format: https://open.spotify.com/playlist/ID
  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/
  );
  if (urlMatch) {
    return { type: urlMatch[1] as SpotifyContentType, id: urlMatch[2] };
  }

  // Bare ID (assume playlist)
  const idMatch = trimmed.match(/^[a-zA-Z0-9]{22}$/);
  if (idMatch) {
    return { type: "playlist", id: trimmed };
  }

  return null;
}

/* ========== Types ========== */

export interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  release_date: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  track_number: number;
  explicit: boolean;
  preview_url: string | null;
  external_urls: { spotify: string };
}

export interface SpotifyPlaylistInfo {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  owner: {
    id: string;
    display_name: string;
  };
  tracks: {
    total: number;
  };
  followers: {
    total: number;
  };
  external_urls: { spotify: string };
}

/* ========== Utility ========== */

/**
 * Format duration from ms to mm:ss
 */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Format total duration for a playlist (e.g., "2 hr 35 min")
 */
export function formatTotalDuration(tracks: SpotifyTrack[]): string {
  const totalMs = tracks.reduce((sum, t) => sum + t.duration_ms, 0);
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);

  if (hours > 0) return `${hours} hr ${minutes} min`;
  return `${minutes} min`;
}

/**
 * Get the best image URL from a Spotify image array
 */
export function getBestImage(
  images: SpotifyImage[],
  preferredSize: "small" | "medium" | "large" = "medium"
): string {
  if (!images || images.length === 0) return "";

  const sorted = [...images].sort(
    (a, b) => (b.width || 0) - (a.width || 0)
  );

  switch (preferredSize) {
    case "small":
      return sorted[sorted.length - 1]?.url || sorted[0].url;
    case "medium":
      return sorted[Math.floor(sorted.length / 2)]?.url || sorted[0].url;
    case "large":
      return sorted[0].url;
    default:
      return sorted[0].url;
  }
}
