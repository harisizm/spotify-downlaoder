"use client";

import { formatDuration, getBestImage } from "@/lib/spotify-api";
import type { DownloadTrack, TrackStatus } from "@/lib/download-queue";
import styles from "./TrackRow.module.css";

interface TrackRowProps {
  track: DownloadTrack;
  index: number;
  onToggleSelect: (id: string) => void;
  onRetry?: (id: string) => void;
  onDownload?: (id: string) => void;
}

const STATUS_CONFIG: Record<TrackStatus, { label: string; color: string; icon: string }> = {
  queued: { label: "Queued", color: "var(--text-tertiary)", icon: "⏳" },
  searching: { label: "Searching...", color: "#60a5fa", icon: "🔍" },
  found: { label: "Found", color: "#34d399", icon: "✓" },
  downloading: { label: "Downloading...", color: "#fbbf24", icon: "⬇" },
  converting: { label: "Converting...", color: "#a78bfa", icon: "⚙" },
  done: { label: "Complete", color: "var(--spotify-green)", icon: "✅" },
  error: { label: "Failed", color: "#f87171", icon: "✗" },
  skipped: { label: "Skipped", color: "var(--text-tertiary)", icon: "⏭" },
  cancelled: { label: "Cancelled", color: "var(--text-tertiary)", icon: "⏹" },
};

export default function TrackRow({
  track,
  index,
  onToggleSelect,
  onRetry,
  onDownload,
}: TrackRowProps) {
  const { spotifyTrack, status, progress, selected, error } = track;
  const config = STATUS_CONFIG[status];
  const albumArt = getBestImage(spotifyTrack.album?.images || [], "small");
  const artists = (spotifyTrack.artists || []).map((a) => a.name).join(", ") || "Unknown Artist";
  const isActive = ["searching", "downloading", "converting"].includes(status);

  return (
    <div
      className={`${styles.row} ${!selected ? styles.deselected : ""} ${
        isActive ? styles.active : ""
      } ${status === "done" ? styles.done : ""} ${
        status === "error" ? styles.errorRow : ""
      }`}
    >
      {/* Selection checkbox */}
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(track.id)}
          disabled={status === "done"}
        />
        <span className={styles.checkmark}>
          {selected && (
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      </label>

      {/* Track number */}
      <span className={styles.index}>
        {isActive ? (
          <div className={styles.waveformBars}>
            <span /><span /><span /><span />
          </div>
        ) : (
          index + 1
        )}
      </span>

      {/* Album art */}
      <div className={styles.art}>
        {albumArt ? (
          <img src={albumArt} alt="" className={styles.artImg} />
        ) : (
          <div className={styles.artPlaceholder}>♫</div>
        )}
      </div>

      {/* Track info */}
      <div className={styles.info}>
        <span className={styles.title}>{spotifyTrack.name || "Unknown Track"}</span>
        <span className={styles.artist}>
          {spotifyTrack.explicit && <span className={styles.explicit}>E</span>}
          {artists}
        </span>
      </div>

      {/* Album name */}
      <span className={styles.album}>{spotifyTrack.album?.name || ""}</span>

      {/* Duration */}
      <span className={styles.duration}>
        {formatDuration(spotifyTrack.duration_ms)}
      </span>

      {/* Status / Progress */}
      <div className={styles.statusCol}>
        {status === "queued" ? (
          <span className={styles.statusText} style={{ color: config.color }}>
            ...
          </span>
        ) : status === "error" ? (
          <div className={styles.errorStatus}>
            <span className={styles.errorText} title={error}>
              {config.icon} {error ? error.slice(0, 30) : config.label}
            </span>
            {onRetry && (
              <button className={styles.retryBtn} onClick={() => onRetry(track.id)}>
                Retry
              </button>
            )}
          </div>
        ) : status === "done" ? (
          <div className={styles.doneStatus}>
            <span className={styles.doneText}>{config.icon}</span>
            {onDownload && (
              <button
                className={styles.dlBtn}
                onClick={() => onDownload(track.id)}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className={styles.progressStatus}>
            <span className={styles.statusText} style={{ color: config.color }}>
              {config.label}
            </span>
            <div className={styles.miniProgress}>
              <div
                className={styles.miniProgressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
