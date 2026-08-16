import { downloadZip } from "client-zip";
import type { SpotifyTrack } from "./spotify-api";

/* ========== Types ========== */

export type TrackStatus =
  | "queued"
  | "searching"
  | "found"
  | "downloading"
  | "converting"
  | "done"
  | "error"
  | "skipped"
  | "cancelled";

export type AudioFormat = "mp3" | "m4a" | "opus" | "wav";
export type AudioQuality = "128" | "192" | "256" | "320";

export interface DownloadTrack {
  id: string;
  spotifyTrack: SpotifyTrack;
  status: TrackStatus;
  progress: number; // 0 to 100
  error?: string;
  youtubeId?: string;
  youtubeTitle?: string;
  blobUrl?: string; // URL.createObjectURL for completed downloads
  retryCount: number;
  selected: boolean;
}

export interface QueueState {
  tracks: DownloadTrack[];
  format: AudioFormat;
  quality: AudioQuality;
  concurrency: number;
  isRunning: boolean;
  isPaused: boolean;
  completedCount: number;
  failedCount: number;
  totalSelected: number;
}

export type QueueEvent =
  | { type: "track-update"; trackId: string; updates: Partial<DownloadTrack> }
  | { type: "queue-state"; state: Partial<QueueState> }
  | { type: "all-complete" }
  | { type: "error"; message: string };

type QueueListener = (event: QueueEvent) => void;

/* ========== Constants ========== */

const WORKER_API_URL =
  process.env.NEXT_PUBLIC_WORKER_API_URL || "http://localhost:3001";
const MAX_RETRIES = 3;
const DEFAULT_CONCURRENCY = 3;

/* ========== Queue Manager ========== */

export class DownloadQueueManager {
  private state: QueueState;
  private listeners: Set<QueueListener> = new Set();
  private activeDownloads = 0;
  private abortControllers: Map<string, AbortController> = new Map();
  private queueIndex = 0;

  constructor() {
    this.state = {
      tracks: [],
      format: "mp3",
      quality: "320",
      concurrency: DEFAULT_CONCURRENCY,
      isRunning: false,
      isPaused: false,
      completedCount: 0,
      failedCount: 0,
      totalSelected: 0,
    };
  }

  /* ---- Event System ---- */

  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: QueueEvent): void {
    this.listeners.forEach((fn) => fn(event));
  }

  private updateTrack(trackId: string, updates: Partial<DownloadTrack>): void {
    const track = this.state.tracks.find((t) => t.id === trackId);
    if (track) {
      Object.assign(track, updates);
      this.emit({ type: "track-update", trackId, updates });
    }
  }

  /* ---- State Accessors ---- */

  getState(): QueueState {
    return { ...this.state };
  }

  getTrack(trackId: string): DownloadTrack | undefined {
    return this.state.tracks.find((t) => t.id === trackId);
  }

  /* ---- Queue Setup ---- */

  /**
   * Initialize the queue with Spotify tracks
   */
  setTracks(spotifyTracks: SpotifyTrack[]): void {
    this.state.tracks = spotifyTracks.map((track, index) => ({
      id: `${track.id || "track"}_${index}`,
      spotifyTrack: track,
      status: "queued",
      progress: 0,
      retryCount: 0,
      selected: true,
    }));
    this.state.totalSelected = this.state.tracks.length;
    this.state.completedCount = 0;
    this.state.failedCount = 0;
    this.queueIndex = 0;
    this.emit({ type: "queue-state", state: this.getState() });
  }

  setFormat(format: AudioFormat): void {
    this.state.format = format;
    this.emit({ type: "queue-state", state: { format } });
  }

  setQuality(quality: AudioQuality): void {
    this.state.quality = quality;
    this.emit({ type: "queue-state", state: { quality } });
  }

  setConcurrency(n: number): void {
    this.state.concurrency = Math.max(1, Math.min(10, n));
    this.emit({
      type: "queue-state",
      state: { concurrency: this.state.concurrency },
    });
  }

  toggleTrackSelection(trackId: string): void {
    const track = this.state.tracks.find((t) => t.id === trackId);
    if (track) {
      track.selected = !track.selected;
      this.state.totalSelected = this.state.tracks.filter(
        (t) => t.selected
      ).length;
      this.emit({
        type: "track-update",
        trackId,
        updates: { selected: track.selected },
      });
    }
  }

  selectAll(): void {
    this.state.tracks.forEach((t) => (t.selected = true));
    this.state.totalSelected = this.state.tracks.length;
    this.emit({ type: "queue-state", state: { totalSelected: this.state.totalSelected } });
  }

  deselectAll(): void {
    this.state.tracks.forEach((t) => (t.selected = false));
    this.state.totalSelected = 0;
    this.emit({ type: "queue-state", state: { totalSelected: 0 } });
  }

  /* ---- Queue Control ---- */

  /**
   * Start processing the download queue
   */
  async start(): Promise<void> {
    if (this.state.isRunning) return;

    this.state.isRunning = true;
    this.state.isPaused = false;
    this.queueIndex = 0;
    this.activeDownloads = 0;
    this.emit({
      type: "queue-state",
      state: { isRunning: true, isPaused: false },
    });

    // Fill up to concurrency limit
    this.processNext();
  }

  pause(): void {
    this.state.isPaused = true;
    this.emit({ type: "queue-state", state: { isPaused: true } });
  }

  resume(): void {
    this.state.isPaused = false;
    this.emit({ type: "queue-state", state: { isPaused: false } });
    this.processNext();
  }

  cancel(): void {
    this.state.isRunning = false;
    this.state.isPaused = false;

    // Abort all active downloads
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();

    // Mark in-progress tracks as cancelled
    this.state.tracks.forEach((track) => {
      if (
        ["searching", "downloading", "converting"].includes(track.status)
      ) {
        this.updateTrack(track.id, { status: "cancelled", progress: 0 });
      }
    });

    this.emit({
      type: "queue-state",
      state: { isRunning: false, isPaused: false },
    });
  }

  /**
   * Retry a specific failed track
   */
  async retryTrack(trackId: string): Promise<void> {
    const track = this.state.tracks.find((t) => t.id === trackId);
    if (!track || track.status !== "error") return;

    track.retryCount = 0;
    this.updateTrack(trackId, {
      status: "queued",
      progress: 0,
      error: undefined,
    });

    this.processTrack(track);
  }

  /* ---- Internal Processing ---- */

  private processNext(): void {
    if (!this.state.isRunning || this.state.isPaused) return;

    while (
      this.activeDownloads < this.state.concurrency &&
      this.queueIndex < this.state.tracks.length
    ) {
      const track = this.state.tracks[this.queueIndex];
      this.queueIndex++;

      if (!track.selected || track.status === "done") continue;

      this.processTrack(track);
    }
  }

  private async processTrack(track: DownloadTrack): Promise<void> {
    this.activeDownloads++;

    const controller = new AbortController();
    this.abortControllers.set(track.id, controller);

    try {
      // Step 1: Search YouTube
      this.updateTrack(track.id, { status: "searching", progress: 10 });

      const searchResult = await this.searchYouTube(
        track.spotifyTrack,
        controller.signal
      );

      if (!searchResult) {
        throw new Error("No matching video found on YouTube");
      }

      this.updateTrack(track.id, {
        status: "found",
        progress: 25,
        youtubeId: searchResult.videoId,
        youtubeTitle: searchResult.title,
      });

      // Step 2: Download & convert
      this.updateTrack(track.id, { status: "downloading", progress: 30 });

      const audioBlob = await this.downloadAudio(
        searchResult.videoId,
        track.id,
        controller.signal
      );

      // Step 3: Create blob URL
      this.updateTrack(track.id, { status: "converting", progress: 90 });

      const blobUrl = URL.createObjectURL(audioBlob);

      this.updateTrack(track.id, {
        status: "done",
        progress: 100,
        blobUrl,
      });

      this.state.completedCount++;
      this.emit({
        type: "queue-state",
        state: { completedCount: this.state.completedCount },
      });
    } catch (err) {
      if (controller.signal.aborted) return;

      const message =
        err instanceof Error ? err.message : "Unknown error occurred";

      if (track.retryCount < MAX_RETRIES) {
        track.retryCount++;
        this.updateTrack(track.id, { status: "queued", progress: 0 });
        // Exponential backoff
        await new Promise((r) =>
          setTimeout(r, Math.pow(2, track.retryCount) * 1000)
        );
        this.processTrack(track);
        return; // Don't decrement activeDownloads since we're retrying
      }

      this.updateTrack(track.id, { status: "error", error: message });
      this.state.failedCount++;
      this.emit({
        type: "queue-state",
        state: { failedCount: this.state.failedCount },
      });
    } finally {
      this.abortControllers.delete(track.id);
      this.activeDownloads--;

      // Check if all done
      const allProcessed = this.state.tracks
        .filter((t) => t.selected)
        .every((t) => ["done", "error", "skipped", "cancelled"].includes(t.status));

      if (allProcessed) {
        this.state.isRunning = false;
        this.emit({ type: "all-complete" });
        this.emit({ type: "queue-state", state: { isRunning: false } });
      } else {
        this.processNext();
      }
    }
  }

  /* ---- Worker API Calls ---- */

  private async searchYouTube(
    track: SpotifyTrack,
    signal: AbortSignal
  ): Promise<{ videoId: string; title: string } | null> {
    const artistName = (track.artists || []).map((a) => a.name).join(", ") || "Unknown Artist";
    const albumName = track.album?.name || "";

    const res = await fetch(`${WORKER_API_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: track.name || "Unknown Track",
        artist: artistName,
        album: albumName,
        duration_ms: track.duration_ms || 0,
      }),
      signal,
    });

    if (!res.ok) {
      throw new Error(`Search failed: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.found) return null;

    return { videoId: data.videoId, title: data.title };
  }

  private async downloadAudio(
    youtubeId: string,
    trackId: string,
    signal: AbortSignal
  ): Promise<Blob> {
    const params = new URLSearchParams({
      id: youtubeId,
      format: this.state.format,
      quality: this.state.quality,
    });

    const res = await fetch(`${WORKER_API_URL}/api/download?${params}`, {
      signal,
    });

    if (!res.ok) {
      throw new Error(`Download failed: ${res.statusText}`);
    }

    // Read response stream
    const contentLength = res.headers.get("Content-Length");
    let blob: Blob;

    if (!contentLength || !res.body) {
      blob = await res.blob();
    } else {
      const total = parseInt(contentLength, 10);
      let loaded = 0;
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;

        const downloadProgress = 30 + (loaded / total) * 60; // 30% to 90%
        this.updateTrack(trackId, { progress: Math.round(downloadProgress) });
      }

      blob = new Blob(chunks as BlobPart[], {
        type: this.state.format === "mp3" ? "audio/mpeg" : `audio/${this.state.format}`,
      });
    }

    // Strict validation: audio files must be at least 20KB
    if (!blob || blob.size < 20_000) {
      throw new Error(`Audio download incomplete (${blob?.size || 0} bytes received). Retrying...`);
    }

    return blob;
  }

  /* ---- File Download Helpers ---- */

  /**
   * Trigger browser download for a single track
   */
  downloadTrackFile(trackId: string): void {
    const track = this.state.tracks.find((t) => t.id === trackId);
    if (!track || !track.blobUrl) return;

    const a = document.createElement("a");
    a.href = track.blobUrl;
    a.download = this.getFilename(track);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Generate a clean filename for a track with optional track numbering
   */
  getFilename(track: DownloadTrack, includeNumber = true): string {
    const artist = (track.spotifyTrack.artists || []).map((a) => a.name).join(", ") || "Unknown Artist";
    const title = track.spotifyTrack.name || "Track";
    const ext = this.state.format;
    const trackNum = track.spotifyTrack.track_number;
    const prefix = includeNumber && trackNum ? `${String(trackNum).padStart(2, "0")}. ` : "";

    // Sanitize filename for Windows, Mac, Linux
    const cleanArtist = artist.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim();
    const cleanTitle = title.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim();
    const clean = `${prefix}${cleanArtist} - ${cleanTitle}`
      .replace(/\s+/g, " ")
      .trim();

    return `${clean || "Track"}.${ext}`;
  }

  /**
   * Package all completed tracks into a single ZIP file and trigger download
   */
  async downloadAllAsZip(playlistName = "Spotify Playlist", customFolderName?: string): Promise<void> {
    const completed = this.state.tracks.filter((t) => t.status === "done" && t.blobUrl);
    if (completed.length === 0) return;

    const folderPrefix = customFolderName ? `${customFolderName.replace(/[<>:"/\\|?*]/g, "").trim()}/` : "";

    const files = await Promise.all(
      completed.map(async (track) => {
        const res = await fetch(track.blobUrl!);
        const blob = await res.blob();
        return {
          name: `${folderPrefix}${this.getFilename(track, true)}`,
          lastModified: new Date(),
          input: blob,
        };
      })
    );

    const zipBlob = await downloadZip(files).blob();
    const zipUrl = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = zipUrl;
    const cleanTitle = (customFolderName || playlistName).replace(/[<>:"/\\|?*]/g, "").trim() || "Spotify_Playlist";
    a.download = `${cleanTitle}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(zipUrl), 60000);
  }

  /**
   * Get all completed tracks' blobs for ZIP creation
   */
  getCompletedBlobs(): { filename: string; blob: Promise<Blob> }[] {
    return this.state.tracks
      .filter((t) => t.status === "done" && t.blobUrl)
      .map((t) => ({
        filename: this.getFilename(t),
        blob: fetch(t.blobUrl!).then((r) => r.blob()),
      }));
  }

  /**
   * Cleanup all blob URLs to free memory
   */
  cleanup(): void {
    this.state.tracks.forEach((track) => {
      if (track.blobUrl) {
        URL.revokeObjectURL(track.blobUrl);
      }
    });
  }
}

/**
 * Singleton instance
 */
let queueInstance: DownloadQueueManager | null = null;

export function getDownloadQueue(): DownloadQueueManager {
  if (!queueInstance) {
    queueInstance = new DownloadQueueManager();
  }
  return queueInstance;
}
