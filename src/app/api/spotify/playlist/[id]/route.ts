/**
 * GET /api/spotify/playlist/[id]?type=playlist|album|track
 *
 * Universal Spotify metadata endpoint.
 *
 * 1. If valid Spotify Developer credentials are present in .env,
 *    it uses the official Spotify Web API with full pagination.
 * 2. If NO credentials are provided (zero-config / blank .env),
 *    it automatically falls back to Spotify's public embed engine.
 *
 * Zero configuration required out of the box. No Spotify Premium needed.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "";

function hasValidCredentials(): boolean {
  return (
    CLIENT_ID.length > 10 &&
    CLIENT_SECRET.length > 10 &&
    !CLIENT_ID.includes("your_spotify") &&
    !CLIENT_SECRET.includes("your_spotify")
  );
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string | null> {
  if (!hasValidCredentials()) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  try {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

    const res = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) return null;

    const data: any = await res.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return cachedToken.token;
  } catch {
    return null;
  }
}

/**
 * Scrape Spotify's public embed page (zero credentials required)
 */
async function fetchViaEmbed(type: string, id: string) {
  const url = `https://open.spotify.com/embed/${type}/${id}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`Spotify public embed returned status ${res.status}`);
  }

  const html = await res.text();
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("Could not parse Spotify embed data");
  }

  const data = JSON.parse(match[1]);
  const entity = data?.props?.pageProps?.state?.data?.entity;

  if (!entity) {
    throw new Error("Spotify entity not found in embed data");
  }

  const coverUrl =
    entity.visualIdentity?.image?.[0]?.url ||
    entity.coverArt?.sources?.[0]?.url ||
    "";

  const images = coverUrl ? [{ url: coverUrl, width: 300, height: 300 }] : [];

  const playlistInfo = {
    id: entity.id || id,
    name: entity.title || entity.name || "Spotify Collection",
    description: entity.subtitle || null,
    images,
    owner: {
      id: "spotify",
      display_name:
        entity.artists?.[0]?.name ||
        entity.authors?.[0]?.name ||
        entity.subtitle ||
        "Spotify",
    },
    tracks: {
      total: entity.trackList?.length || 1,
    },
    followers: {
      total: 0,
    },
    external_urls: {
      spotify: `https://open.spotify.com/${type}/${id}`,
    },
  };

  let tracks: any[] = [];

  if (type === "track") {
    const artistList =
      entity.artists?.map((a: any) => ({ id: a.id || "artist", name: a.name })) ||
      (entity.subtitle
        ? entity.subtitle.split(/,\s*/).map((n: string) => ({ id: "artist", name: n }))
        : [{ id: "artist", name: "Artist" }]);

    tracks = [
      {
        id: entity.id || id,
        name: entity.title || entity.name || "Track",
        artists: artistList,
        album: {
          id: "album",
          name: entity.title || "Album",
          images,
          release_date: entity.releaseDate?.isoString || "",
        },
        duration_ms: entity.duration || 0,
        track_number: 1,
        explicit: entity.isExplicit || false,
        preview_url: entity.audioPreview?.url || null,
        external_urls: {
          spotify: `https://open.spotify.com/track/${id}`,
        },
      },
    ];
  } else {
    tracks = (entity.trackList || []).map((t: any, idx: number) => {
      const trackId = t.uri?.split(":")[2] || t.uid || `track_${idx}`;
      return {
        id: trackId,
        name: t.title || t.name || `Track ${idx + 1}`,
        artists: (t.subtitle || "Artist")
          .split(/,\s*/)
          .map((name: string) => ({ id: "artist", name })),
        album: {
          id: entity.id || "album",
          name: entity.title || entity.name || "Album",
          images,
          release_date: entity.releaseDate?.isoString || "",
        },
        duration_ms: t.duration || 0,
        track_number: idx + 1,
        explicit: t.isExplicit || false,
        preview_url: t.audioPreview?.url || null,
        external_urls: {
          spotify: `https://open.spotify.com/track/${trackId}`,
        },
      };
    });
  }

  return { playlist: playlistInfo, tracks };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "playlist";

    // Attempt 1: Try official Spotify API if developer keys exist in .env
    const token = await getAppToken();

    if (token) {
      try {
        if (type === "playlist") {
          const playlistRes = await fetch(
            `${SPOTIFY_API_BASE}/playlists/${id}?fields=id,name,description,images,owner(id,display_name),tracks(total),followers(total),external_urls`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (playlistRes.ok) {
            const playlist = await playlistRes.json();
            const tracks: any[] = [];
            let tracksUrl: string | null =
              `${SPOTIFY_API_BASE}/playlists/${id}/tracks?limit=100&fields=next,total,items(added_at,track(id,name,artists(id,name),album(id,name,images,release_date),duration_ms,track_number,explicit,preview_url,external_urls))`;

            while (tracksUrl) {
              const tracksRes: Response = await fetch(tracksUrl, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!tracksRes.ok) break;
              const data: any = await tracksRes.json();
              const validTracks = data.items
                .filter((item: { track: unknown }) => item.track !== null)
                .map((item: { track: unknown }) => item.track);
              tracks.push(...validTracks);
              tracksUrl = data.next;
            }

            if (tracks.length > 0) {
              return NextResponse.json({ playlist, tracks });
            }
            console.warn("Official API returned 0 tracks for playlist, falling back to public embed extraction...");
          }
        } else if (type === "album") {
          const albumRes = await fetch(`${SPOTIFY_API_BASE}/albums/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (albumRes.ok) {
            const album = await albumRes.json();
            const tracks = (album.tracks?.items || []).map((t: any) => ({
              ...t,
              album: {
                id: album.id,
                name: album.name,
                images: album.images,
                release_date: album.release_date,
              },
            }));
            const playlist = {
              id: album.id,
              name: album.name,
              description: `Album by ${album.artists?.map((a: any) => a.name).join(", ")}`,
              images: album.images,
              owner: { id: "artist", display_name: album.artists?.[0]?.name || "Artist" },
              tracks: { total: tracks.length },
              followers: { total: 0 },
              external_urls: album.external_urls,
            };
            return NextResponse.json({ playlist, tracks });
          }
        } else if (type === "track") {
          const trackRes = await fetch(`${SPOTIFY_API_BASE}/tracks/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (trackRes.ok) {
            const track = await trackRes.json();
            const playlist = {
              id: track.id,
              name: track.name,
              description: `Track by ${track.artists?.map((a: any) => a.name).join(", ")}`,
              images: track.album?.images || [],
              owner: { id: "artist", display_name: track.artists?.[0]?.name || "Artist" },
              tracks: { total: 1 },
              followers: { total: 0 },
              external_urls: track.external_urls,
            };
            return NextResponse.json({ playlist, tracks: [track] });
          }
        }
      } catch (apiErr) {
        console.warn("Official API request failed, falling back to public embed:", apiErr);
      }
    }

    // Attempt 2: Zero-config fallback (public embed extraction)
    const fallbackData = await fetchViaEmbed(type, id);
    const isEmbedLimited = type === "playlist" && fallbackData.tracks.length >= 100;
    return NextResponse.json({ ...fallbackData, isEmbedLimited });
  } catch (error) {
    console.error("Spotify metadata resolution error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to resolve Spotify metadata. Please verify the URL is public.",
      },
      { status: 500 }
    );
  }
}
