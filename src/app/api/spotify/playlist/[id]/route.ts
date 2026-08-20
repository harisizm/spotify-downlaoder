/**
 * GET /api/spotify/playlist/[id]?type=playlist|album|track
 *
 * 100% Zero-Credential Deep Pagination Engine for Spotify.
 *
 * Automatically bootstraps an anonymous session token directly from Spotify's
 * embed gateway and uses Spotify's GraphQL Pathfinder API to paginate through
 * ALL songs (100, 200, 500+ tracks) without requiring ANY Spotify Developer API keys
 * or user credentials.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PATHFINDER_URL = "https://api-partner.spotify.com/pathfinder/v1/query";
const PLAYLIST_QUERY_HASH = "a65e12194ed5fc443a1cdebed5fabe33ca5b07b987185d63c72483867ad13cb4";
const ALBUM_QUERY_HASH = "b9bfabef66ed756e5e13f68a942deb60bd4125ec1f1be8cc42769dc0259b4b10";
const TRACK_QUERY_HASH = "612585ae06ba435ad26369870deaae23b5c8800a256cd8a57e08eddc25a37294";

// In-memory token cache
let cachedSession: { token: string; expiresAt: number } | null = null;

/**
 * Bootstrap an anonymous access token from Spotify's public embed gateway
 */
async function getAnonymousToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cachedSession && now < cachedSession.expiresAt - 60_000) {
    return cachedSession.token;
  }

  // Any public track/embed page seeds the anonymous token
  const bootstrapUrl = "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC";
  const res = await fetch(bootstrapUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to bootstrap Spotify guest session (HTTP ${res.status})`);
  }

  const html = await res.text();
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("Could not parse Spotify embed bootstrap data");
  }

  const nextData = JSON.parse(match[1]);
  const session = nextData?.props?.pageProps?.state?.settings?.session;
  const token = session?.accessToken;
  const expiresAt = session?.accessTokenExpirationTimestampMs || now + 3600 * 1000;

  if (!token) {
    throw new Error("Anonymous accessToken not found in Spotify embed session");
  }

  cachedSession = { token, expiresAt };
  return token;
}

/**
 * Make an authorized GraphQL Pathfinder query
 */
async function pathfinderFetch(
  operationName: string,
  sha256Hash: string,
  variables: Record<string, any>,
  retries = 2
): Promise<any> {
  let token = await getAnonymousToken();

  for (let attempt = 0; attempt <= retries; attempt++) {
    const params = new URLSearchParams({
      operationName,
      variables: JSON.stringify(variables),
      extensions: JSON.stringify({
        persistedQuery: { version: 1, sha256Hash },
      }),
    });

    const res = await fetch(`${PATHFINDER_URL}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "app-platform": "WebPlayer",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (res.status === 401 && attempt < retries) {
      // Token expired, force bootstrap new anonymous session
      token = await getAnonymousToken(true);
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Spotify Pathfinder HTTP ${res.status}: ${errText}`);
    }

    const json = await res.json();
    if (json.errors && json.errors.length > 0) {
      throw new Error(`GraphQL error: ${json.errors[0]?.message || "Unknown error"}`);
    }

    return json.data;
  }

  throw new Error("Max retries exceeded for Spotify request");
}

/**
 * Fetch ALL tracks from a playlist using deep pagination
 */
async function fetchAllPlaylistTracks(playlistId: string) {
  let offset = 0;
  const limit = 100;
  const tracks: any[] = [];
  let playlistInfo: any = null;
  let totalDeclared = 0;

  while (true) {
    const variables = {
      uri: `spotify:playlist:${playlistId}`,
      offset,
      limit,
      enableWatchFeedEntrypoint: false,
    };

    const data = await pathfinderFetch("fetchPlaylist", PLAYLIST_QUERY_HASH, variables);
    const playlistV2 = data?.playlistV2;
    if (!playlistV2) {
      throw new Error("Playlist data not found in Spotify response");
    }

    if (!playlistInfo) {
      const coverImages = (playlistV2.images?.items || []).map((img: any) => ({
        url: img.sources?.[0]?.url || "",
        width: img.sources?.[0]?.width || 300,
        height: img.sources?.[0]?.height || 300,
      }));

      totalDeclared = playlistV2.content?.totalCount || 0;

      playlistInfo = {
        id: playlistId,
        name: playlistV2.name || "Spotify Playlist",
        description: playlistV2.description || null,
        images: coverImages.length > 0 ? coverImages : [{ url: "", width: 300, height: 300 }],
        owner: {
          id: playlistV2.ownerV2?.data?.username || "spotify",
          display_name: playlistV2.ownerV2?.data?.name || "Spotify",
        },
        tracks: { total: totalDeclared },
        followers: { total: 0 },
        external_urls: {
          spotify: `https://open.spotify.com/playlist/${playlistId}`,
        },
      };
    }

    const items = playlistV2.content?.items || [];
    if (items.length === 0) break;

    for (const item of items) {
      const trackData = item.itemV2?.data;
      if (trackData && (trackData.__typename === "Track" || trackData.__typename === "Episode")) {
        const artists = (trackData.artists?.items || []).map((a: any) => ({
          id: a.uri?.split(":")[2] || "",
          name: a.profile?.name || "Unknown Artist",
        }));

        const coverImages = (trackData.albumOfTrack?.coverArt?.sources || []).map((s: any) => ({
          url: s.url,
          width: s.width,
          height: s.height,
        }));

        tracks.push({
          id: trackData.uri?.split(":")[2] || trackData.id,
          name: trackData.name,
          artists: artists.length > 0 ? artists : [{ id: "artist", name: "Unknown Artist" }],
          album: {
            id: trackData.albumOfTrack?.uri?.split(":")[2] || "",
            name: trackData.albumOfTrack?.name || "",
            images: coverImages,
            release_date: trackData.albumOfTrack?.date?.isoString || "",
          },
          duration_ms: trackData.trackDuration?.totalMilliseconds || 0,
          track_number: tracks.length + 1,
          explicit: Boolean(trackData.contentRating?.label === "EXPLICIT"),
          preview_url: null,
          external_urls: {
            spotify: `https://open.spotify.com/track/${trackData.uri?.split(":")[2]}`,
          },
        });
      }
    }

    offset += items.length;

    // Stop when all declared tracks loaded or no more items returned
    if ((totalDeclared > 0 && offset >= totalDeclared) || items.length < limit) {
      break;
    }
  }

  return { playlist: playlistInfo, tracks };
}

/**
 * Fetch Album tracks using Pathfinder
 */
async function fetchAlbum(albumId: string) {
  const variables = {
    uri: `spotify:album:${albumId}`,
    locale: "",
    offset: 0,
    limit: 100,
  };

  const data = await pathfinderFetch("getAlbum", ALBUM_QUERY_HASH, variables);
  const albumUnion = data?.albumUnion;
  if (!albumUnion) {
    throw new Error("Album not found");
  }

  const coverImages = (albumUnion.coverArt?.sources || []).map((s: any) => ({
    url: s.url,
    width: s.width,
    height: s.height,
  }));

  const artists = (albumUnion.artists?.items || []).map((a: any) => ({
    id: a.uri?.split(":")[2] || "",
    name: a.profile?.name || "Artist",
  }));

  const items = albumUnion.tracksV2?.items || albumUnion.tracks?.items || [];
  const tracks = items.map((item: any, idx: number) => {
    const t = item.track || item;
    const tArtists = (t.artists?.items || t.artists || []).map((a: any) => ({
      id: a.uri?.split(":")[2] || a.id || "",
      name: a.profile?.name || a.name || "Artist",
    }));

    return {
      id: t.uri?.split(":")[2] || t.id || `track_${idx}`,
      name: t.name || `Track ${idx + 1}`,
      artists: tArtists.length > 0 ? tArtists : artists,
      album: {
        id: albumId,
        name: albumUnion.name || "Album",
        images: coverImages,
        release_date: albumUnion.date?.isoString || "",
      },
      duration_ms: t.duration?.totalMilliseconds || t.duration_ms || 0,
      track_number: idx + 1,
      explicit: Boolean(t.contentRating?.label === "EXPLICIT" || t.explicit),
      preview_url: null,
      external_urls: {
        spotify: `https://open.spotify.com/track/${t.uri?.split(":")[2] || t.id}`,
      },
    };
  });

  const playlistInfo = {
    id: albumId,
    name: albumUnion.name || "Album",
    description: `Album by ${artists.map((a: any) => a.name).join(", ")}`,
    images: coverImages,
    owner: { id: "artist", display_name: artists[0]?.name || "Artist" },
    tracks: { total: tracks.length },
    followers: { total: 0 },
    external_urls: {
      spotify: `https://open.spotify.com/album/${albumId}`,
    },
  };

  return { playlist: playlistInfo, tracks };
}

/**
 * Fetch Single Track using Pathfinder
 */
async function fetchTrack(trackId: string) {
  const variables = {
    uri: `spotify:track:${trackId}`,
  };

  const data = await pathfinderFetch("getTrack", TRACK_QUERY_HASH, variables);
  const trackUnion = data?.trackUnion;
  if (!trackUnion) {
    throw new Error("Track not found");
  }

  const coverImages = (trackUnion.albumOfTrack?.coverArt?.sources || []).map((s: any) => ({
    url: s.url,
    width: s.width,
    height: s.height,
  }));

  const artists = (trackUnion.firstArtist?.items || trackUnion.otherArtists?.items || []).map((a: any) => ({
    id: a.uri?.split(":")[2] || "",
    name: a.profile?.name || "Artist",
  }));

  const track = {
    id: trackId,
    name: trackUnion.name || "Track",
    artists: artists.length > 0 ? artists : [{ id: "artist", name: "Artist" }],
    album: {
      id: trackUnion.albumOfTrack?.uri?.split(":")[2] || "",
      name: trackUnion.albumOfTrack?.name || "Album",
      images: coverImages,
      release_date: trackUnion.albumOfTrack?.date?.isoString || "",
    },
    duration_ms: trackUnion.duration?.totalMilliseconds || 0,
    track_number: trackUnion.trackNumber || 1,
    explicit: Boolean(trackUnion.contentRating?.label === "EXPLICIT"),
    preview_url: null,
    external_urls: {
      spotify: `https://open.spotify.com/track/${trackId}`,
    },
  };

  const playlistInfo = {
    id: trackId,
    name: track.name,
    description: `Track by ${track.artists.map((a: any) => a.name).join(", ")}`,
    images: coverImages,
    owner: { id: "artist", display_name: track.artists[0]?.name || "Artist" },
    tracks: { total: 1 },
    followers: { total: 0 },
    external_urls: track.external_urls,
  };

  return { playlist: playlistInfo, tracks: [track] };
}

/**
 * Direct Embed Scraping Fallback
 */
async function fetchViaEmbedFallback(type: string, id: string) {
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
  if (!entity) throw new Error("Entity not found in embed data");

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
      display_name: entity.artists?.[0]?.name || entity.subtitle || "Spotify",
    },
    tracks: { total: entity.trackList?.length || 1 },
    followers: { total: 0 },
    external_urls: {
      spotify: `https://open.spotify.com/${type}/${id}`,
    },
  };

  const tracks = (entity.trackList || []).map((t: any, idx: number) => {
    const trackId = t.uri?.split(":")[2] || t.uid || `track_${idx}`;
    return {
      id: trackId,
      name: t.title || t.name || `Track ${idx + 1}`,
      artists: (t.subtitle || "Artist").split(/,\s*/).map((name: string) => ({ id: "artist", name })),
      album: {
        id: entity.id || "album",
        name: entity.title || entity.name || "Album",
        images,
        release_date: entity.releaseDate?.isoString || "",
      },
      duration_ms: t.duration || 0,
      track_number: idx + 1,
      explicit: Boolean(t.isExplicit),
      preview_url: null,
      external_urls: {
        spotify: `https://open.spotify.com/track/${trackId}`,
      },
    };
  });

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

    try {
      if (type === "playlist") {
        const result = await fetchAllPlaylistTracks(id);
        console.log(`✓ Deep Pagination: Successfully retrieved ${result.tracks.length} tracks for playlist "${result.playlist.name}" (Zero Credentials)`);
        return NextResponse.json(result);
      } else if (type === "album") {
        const result = await fetchAlbum(id);
        return NextResponse.json(result);
      } else if (type === "track") {
        const result = await fetchTrack(id);
        return NextResponse.json(result);
      }
    } catch (primaryErr) {
      console.warn("Primary Pathfinder extraction failed, attempting embed fallback:", primaryErr);
    }

    // Embed Fallback
    const fallbackData = await fetchViaEmbedFallback(type, id);
    return NextResponse.json(fallbackData);
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
