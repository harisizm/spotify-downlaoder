/**
 * Spotify Web API Client
 *
 * Handles playlist fetching with full pagination (no 100-song limit),
 * URL parsing, and rate limit handling.
 */

import { getValidAccessToken } from "./spotify-auth";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const PAGE_SIZE = 100; // Spotify's max per request

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

/* ========== Rate-Limited Fetch ========== */

async function spotifyFetch(
  url: string,
  accessToken: string,
  retries = 3
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) return res;

    // Rate limited, wait and retry
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") || "1", 10);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }

    // Auth error, token might be expired
    if (res.status === 401) {
      throw new Error("AUTH_EXPIRED");
    }

    throw new Error(`Spotify API error: ${res.status} ${res.statusText}`);
  }

  throw new Error("Max retries exceeded for Spotify API request");
}

/* ========== Playlist API ========== */

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

export interface SpotifyPlaylistTrackItem {
  added_at: string;
  track: SpotifyTrack | null; // null if track was removed
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

/**
 * Get playlist metadata (name, cover, owner, track count)
 */
export async function getPlaylistInfo(
  playlistId: string
): Promise<SpotifyPlaylistInfo> {
  const token = await getValidAccessToken();
  const res = await spotifyFetch(
    `${SPOTIFY_API_BASE}/playlists/${playlistId}?fields=id,name,description,images,owner(id,display_name),tracks(total),followers(total),external_urls`,
    token
  );
  return res.json();
}

/**
 * Fetch ALL tracks from a playlist with pagination.
 * No 100-song limit. Follows the `next` cursor until all tracks are loaded.
 *
 * @param onProgress - Callback with (loaded, total) for progress tracking
 */
export async function getPlaylistTracks(
  playlistId: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<SpotifyTrack[]> {
  const token = await getValidAccessToken();
  const tracks: SpotifyTrack[] = [];

  let url: string | null =
    `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks?limit=${PAGE_SIZE}&fields=next,total,items(added_at,track(id,name,artists(id,name),album(id,name,images,release_date),duration_ms,track_number,explicit,preview_url,external_urls))`;

  let total = 0;

  while (url) {
    const res = await spotifyFetch(url, token);
    const data = await res.json();

    if (!total) total = data.total;

    const validTracks = (data.items as SpotifyPlaylistTrackItem[])
      .filter((item) => item.track !== null)
      .map((item) => item.track as SpotifyTrack);

    tracks.push(...validTracks);

    if (onProgress) {
      onProgress(tracks.length, total);
    }

    url = data.next;
  }

  return tracks;
}

/**
 * Get album info and tracks
 */
export async function getAlbumTracks(albumId: string): Promise<{
  info: { name: string; images: SpotifyImage[]; artists: SpotifyArtist[] };
  tracks: SpotifyTrack[];
}> {
  const token = await getValidAccessToken();
  const res = await spotifyFetch(
    `${SPOTIFY_API_BASE}/albums/${albumId}`,
    token
  );
  const album = await res.json();

  const tracks: SpotifyTrack[] = album.tracks.items.map(
    (t: SpotifyTrack & { album?: SpotifyAlbum }) => ({
      ...t,
      album: {
        id: album.id,
        name: album.name,
        images: album.images,
        release_date: album.release_date,
      },
    })
  );

  return {
    info: {
      name: album.name,
      images: album.images,
      artists: album.artists,
    },
    tracks,
  };
}

/**
 * Get a single track
 */
export async function getTrack(trackId: string): Promise<SpotifyTrack> {
  const token = await getValidAccessToken();
  const res = await spotifyFetch(
    `${SPOTIFY_API_BASE}/tracks/${trackId}`,
    token
  );
  return res.json();
}

/**
 * Get the user's playlists
 */
export async function getUserPlaylists(
  limit = 50
): Promise<SpotifyPlaylistInfo[]> {
  const token = await getValidAccessToken();
  const res = await spotifyFetch(
    `${SPOTIFY_API_BASE}/me/playlists?limit=${limit}`,
    token
  );
  const data = await res.json();
  return data.items;
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
