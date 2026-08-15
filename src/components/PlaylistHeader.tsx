"use client";

import { getBestImage, formatTotalDuration, type SpotifyPlaylistInfo, type SpotifyTrack } from "@/lib/spotify-api";
import styles from "./PlaylistHeader.module.css";

interface PlaylistHeaderProps {
  playlist: SpotifyPlaylistInfo;
  tracks: SpotifyTrack[];
  isLoading?: boolean;
}

export default function PlaylistHeader({
  playlist,
  tracks,
  isLoading = false,
}: PlaylistHeaderProps) {
  const coverUrl = getBestImage(playlist.images, "large");
  const totalDuration = tracks.length > 0 ? formatTotalDuration(tracks) : "...";

  return (
    <div className={styles.header}>
      {/* Background gradient from album art */}
      <div
        className={styles.bgGradient}
        style={{
          backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
        }}
      />
      <div className={styles.bgOverlay} />

      <div className={styles.content}>
        <div className={styles.coverWrapper}>
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={playlist.name}
              className={styles.cover}
            />
          ) : (
            <div className={styles.coverPlaceholder}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
          )}
        </div>

        <div className={styles.info}>
          <span className={styles.type}>Playlist</span>
          <h1 className={styles.name}>{playlist.name}</h1>
          {playlist.description && (
            <p
              className={styles.description}
              dangerouslySetInnerHTML={{ __html: playlist.description }}
            />
          )}
          <div className={styles.meta}>
            <span className={styles.owner}>{playlist.owner.display_name}</span>
            <span className={styles.dot}>•</span>
            <span>
              {isLoading ? (
                <span className={styles.loadingText}>Loading tracks...</span>
              ) : (
                `${tracks.length} songs`
              )}
            </span>
            {!isLoading && tracks.length > 0 && (
              <>
                <span className={styles.dot}>•</span>
                <span>{totalDuration}</span>
              </>
            )}
            {playlist.followers && playlist.followers.total > 0 && (
              <>
                <span className={styles.dot}>•</span>
                <span>{playlist.followers.total.toLocaleString()} likes</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
