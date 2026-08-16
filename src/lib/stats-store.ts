/**
 * Anonymous Stats Store
 * Captures zero PII (no names, no user emails, no IP addresses, no Spotify accounts).
 * Stores strictly technical download metrics: formats, track counts, duration, and sanitized titles.
 */

export interface AnonymousDownloadEvent {
  id: string;
  timestamp: string; // ISO 8601
  type: "playlist" | "album" | "track";
  title: string; // Public playlist or song title
  artist?: string;
  tracksCount: number;
  format: "mp3" | "wav" | "m4a" | "opus";
  quality: "128" | "192" | "256" | "320";
  sizeBytes: number;
  durationSeconds: number;
  status: "completed" | "partial" | "failed";
  platform: "Desktop" | "Mobile" | "Tablet";
}

export interface StatsSummary {
  totalDownloads: number;
  totalTracks: number;
  totalBytes: number;
  successRate: number;
  avgDurationSeconds: number;
  formatBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
  topTracks: { title: string; artist: string; count: number }[];
}

const STORAGE_KEY = "pasooriizm_anonymous_stats_v1";

// Realistic seed telemetry for instant visualization if store is fresh
const SEED_EVENTS: AnonymousDownloadEvent[] = [
  {
    id: "evt-101",
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    type: "playlist",
    title: "Coke Studio Pakistan - Best of All Seasons",
    artist: "Coke Studio",
    tracksCount: 42,
    format: "mp3",
    quality: "320",
    sizeBytes: 362400000,
    durationSeconds: 38,
    status: "completed",
    platform: "Desktop",
  },
  {
    id: "evt-102",
    timestamp: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
    type: "track",
    title: "Pasoori",
    artist: "Ali Sethi, Shae Gill",
    tracksCount: 1,
    format: "wav",
    quality: "320",
    sizeBytes: 39551054,
    durationSeconds: 4,
    status: "completed",
    platform: "Mobile",
  },
  {
    id: "evt-103",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    type: "album",
    title: "Open Letter",
    artist: "Talha Anjum, Umair",
    tracksCount: 15,
    format: "mp3",
    quality: "320",
    sizeBytes: 135800000,
    durationSeconds: 18,
    status: "completed",
    platform: "Desktop",
  },
  {
    id: "evt-104",
    timestamp: new Date(Date.now() - 1000 * 60 * 78).toISOString(),
    type: "track",
    title: "Kahani Suno 2.0",
    artist: "Kaifi Khalil",
    tracksCount: 1,
    format: "mp3",
    quality: "320",
    sizeBytes: 6947664,
    durationSeconds: 3,
    status: "completed",
    platform: "Desktop",
  },
  {
    id: "evt-105",
    timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    type: "playlist",
    title: "Pakistani Indie & Acoustic Chill",
    artist: "Various Artists",
    tracksCount: 28,
    format: "wav",
    quality: "320",
    sizeBytes: 980000000,
    durationSeconds: 32,
    status: "completed",
    platform: "Desktop",
  },
  {
    id: "evt-106",
    timestamp: new Date(Date.now() - 1000 * 60 * 160).toISOString(),
    type: "track",
    title: "Tu Hai Kahan",
    artist: "AUR",
    tracksCount: 1,
    format: "m4a",
    quality: "256",
    sizeBytes: 8120000,
    durationSeconds: 4,
    status: "completed",
    platform: "Mobile",
  },
  {
    id: "evt-107",
    timestamp: new Date(Date.now() - 1000 * 60 * 220).toISOString(),
    type: "album",
    title: "Doorie",
    artist: "Atif Aslam",
    tracksCount: 18,
    format: "mp3",
    quality: "320",
    sizeBytes: 154000000,
    durationSeconds: 22,
    status: "completed",
    platform: "Desktop",
  },
  {
    id: "evt-108",
    timestamp: new Date(Date.now() - 1000 * 60 * 310).toISOString(),
    type: "track",
    title: "Downers at Dusk",
    artist: "Talha Anjum",
    tracksCount: 1,
    format: "mp3",
    quality: "320",
    sizeBytes: 10242227,
    durationSeconds: 4,
    status: "completed",
    platform: "Desktop",
  },
];

export async function fetchRemoteStats(): Promise<AnonymousDownloadEvent[]> {
  try {
    const res = await fetch("/api/stats");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.events) && data.events.length > 0) {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.events));
        }
        return data.events;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch remote stats:", e);
  }
  return getAnonymousEvents();
}

export function getAnonymousEvents(): AnonymousDownloadEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_EVENTS));
      return SEED_EVENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function clearAllStats(): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    } catch (e) {
      console.warn("Failed to clear local stats:", e);
    }
  }

  try {
    await fetch("/api/stats", { method: "DELETE" });
  } catch (e) {
    console.warn("Failed to clear remote MongoDB stats:", e);
  }
}

export function logAnonymousDownload(
  event: Omit<AnonymousDownloadEvent, "id" | "timestamp" | "platform">
): void {
  if (typeof window === "undefined") return;

  const width = window.innerWidth;
  const platform: "Desktop" | "Mobile" | "Tablet" =
    width < 768 ? "Mobile" : width < 1024 ? "Tablet" : "Desktop";

  const newEvent: AnonymousDownloadEvent = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    platform,
  };

  // 1. Save to local cache
  try {
    const current = getAnonymousEvents();
    const updated = [newEvent, ...current].slice(0, 500);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to record anonymous stat locally:", e);
  }

  // 2. Asynchronously sync to MongoDB backend
  fetch("/api/stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newEvent),
  }).catch(() => {});
}

export function computeStatsSummary(events: AnonymousDownloadEvent[]): StatsSummary {
  const totalDownloads = events.length;
  const totalTracks = events.reduce((sum, e) => sum + e.tracksCount, 0);
  const totalBytes = events.reduce((sum, e) => sum + e.sizeBytes, 0);
  const completed = events.filter((e) => e.status === "completed").length;
  const successRate = totalDownloads > 0 ? Math.round((completed / totalDownloads) * 1000) / 10 : 100;
  const avgDuration =
    totalDownloads > 0
      ? Math.round(
          (events.reduce((sum, e) => sum + e.durationSeconds, 0) / totalDownloads) * 10
        ) / 10
      : 0;

  const formatBreakdown: Record<string, number> = {
    mp3: 0,
    wav: 0,
    m4a: 0,
    opus: 0,
  };

  const typeBreakdown: Record<string, number> = {
    playlist: 0,
    album: 0,
    track: 0,
  };

  const trackCounts: Record<string, { title: string; artist: string; count: number }> = {};

  events.forEach((e) => {
    formatBreakdown[e.format] = (formatBreakdown[e.format] || 0) + 1;
    typeBreakdown[e.type] = (typeBreakdown[e.type] || 0) + 1;

    const key = `${e.title}__${e.artist || ""}`;
    if (!trackCounts[key]) {
      trackCounts[key] = { title: e.title, artist: e.artist || "Unknown Artist", count: 0 };
    }
    trackCounts[key].count += e.tracksCount;
  });

  const topTracks = Object.values(trackCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalDownloads,
    totalTracks,
    totalBytes,
    successRate,
    avgDurationSeconds: avgDuration,
    formatBreakdown,
    typeBreakdown,
    topTracks,
  };
}
