"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlaylistHeader from "@/components/PlaylistHeader";
import QualitySelector from "@/components/QualitySelector";
import TrackRow from "@/components/TrackRow";
import ProgressBar from "@/components/ProgressBar";
import LiveDownloadProgress from "@/components/LiveDownloadProgress";
import SpotifyButton from "@/components/SpotifyButton";
import {
  getPlaylistInfo,
  getPlaylistTracks,
  type SpotifyPlaylistInfo,
  type SpotifyTrack,
} from "@/lib/spotify-api";
import {
  getDownloadQueue,
  type DownloadTrack,
  type AudioFormat,
  type AudioQuality,
  type QueueState,
} from "@/lib/download-queue";
import { isTokenValid, initiateSpotifyAuth } from "@/lib/spotify-auth";
import { Suspense } from "react";
import styles from "./download.module.css";

interface PageParams {
  playlistId: string;
}

function DownloadContent({ playlistId }: { playlistId: string }) {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "playlist";

  const [playlist, setPlaylist] = useState<SpotifyPlaylistInfo | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 });
  const [error, setError] = useState("");
  const [isLimited, setIsLimited] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "selected" | "downloading" | "completed" | "failed">("all");
  const [folderName, setFolderName] = useState("");

  // Download state
  const [queueTracks, setQueueTracks] = useState<DownloadTrack[]>([]);
  const [queueState, setQueueState] = useState<Partial<QueueState>>({});
  const [format, setFormat] = useState<AudioFormat>("mp3");
  const [quality, setQuality] = useState<AudioQuality>("320");

  const queue = getDownloadQueue();

  const loggedIn = isTokenValid();

  // Fetch playlist data (works with or without login)
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (loggedIn && type === "playlist") {
          // User is logged in: use their token for private + public playlists
          const info = await getPlaylistInfo(playlistId);
          setPlaylist(info);
          setFolderName(info.name || "Spotify Playlist");
          setLoadingPlaylist(false);

          const allTracks = await getPlaylistTracks(
            playlistId,
            (loaded, total) => {
              setLoadProgress({ loaded, total });
            }
          );
          setTracks(allTracks);
          setLoadingTracks(false);
          queue.setTracks(allTracks);
        } else {
          // Universal fetcher (works for playlist, album, track without login)
          const res = await fetch(`/api/spotify/playlist/${playlistId}?type=${type}`);
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Failed to fetch Spotify content. It may be private.");
          }
          const data = await res.json();
          setPlaylist(data.playlist);
          setFolderName(data.playlist?.name || "Spotify Playlist");
          setLoadingPlaylist(false);
          setTracks(data.tracks);
          setLoadingTracks(false);
          queue.setTracks(data.tracks);
          if (data.isEmbedLimited) {
            setIsLimited(true);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load playlist"
        );
        setLoadingPlaylist(false);
        setLoadingTracks(false);
      }
    };

    fetchData();
  }, [playlistId]);

  // Subscribe to queue events
  useEffect(() => {
    const unsubscribe = queue.subscribe((event) => {
      if (event.type === "track-update" || event.type === "queue-state") {
        setQueueTracks([...queue.getState().tracks]);
        setQueueState(queue.getState());
      }
      if (event.type === "all-complete") {
        // Queue completed
      }
    });

    return () => unsubscribe();
  }, [queue]);

  // Handlers
  const handleFormatChange = useCallback(
    (f: AudioFormat) => {
      setFormat(f);
      queue.setFormat(f);
    },
    [queue]
  );

  const handleQualityChange = useCallback(
    (q: AudioQuality) => {
      setQuality(q);
      queue.setQuality(q);
    },
    [queue]
  );

  const handleStartDownload = () => {
    queue.start();
  };

  const handlePause = () => {
    if (queueState.isPaused) {
      queue.resume();
    } else {
      queue.pause();
    }
  };

  const handleCancel = () => {
    queue.cancel();
  };

  const handleSelectAll = () => {
    queue.selectAll();
    setQueueTracks([...queue.getState().tracks]);
  };

  const handleDeselectAll = () => {
    queue.deselectAll();
    setQueueTracks([...queue.getState().tracks]);
  };

  const handleToggleSelect = (id: string) => {
    queue.toggleTrackSelection(id);
    setQueueTracks([...queue.getState().tracks]);
  };

  const handleRetry = (id: string) => {
    queue.retryTrack(id);
  };

  const handleRetryAllFailed = () => {
    queueTracks
      .filter((t) => t.status === "error")
      .forEach((t) => queue.retryTrack(t.id));
  };

  const handleDownloadTrack = (id: string) => {
    queue.downloadTrackFile(id);
  };

  const handleSaveZip = () => {
    const cleanFolder = folderName.trim() || playlist?.name || "Spotify_Playlist";
    queue.downloadAllAsZip(cleanFolder, cleanFolder);
  };

  // Computed values
  const completedCount = queueState.completedCount || 0;
  const failedCount = queueState.failedCount || 0;
  const totalSelected = queueState.totalSelected || 0;
  const isRunning = queueState.isRunning || false;
  const isPaused = queueState.isPaused || false;
  const overallProgress =
    totalSelected > 0 ? (completedCount / totalSelected) * 100 : 0;

  // Filtered tracks for display
  const allCount = queueTracks.length;
  const selectedCount = queueTracks.filter((t) => t.selected).length;
  const downloadingCount = queueTracks.filter((t) =>
    ["searching", "found", "downloading", "converting"].includes(t.status)
  ).length;
  const doneCount = queueTracks.filter((t) => t.status === "done").length;
  const errorCount = queueTracks.filter((t) => t.status === "error").length;

  const filteredTracks = queueTracks.filter((track) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = (track.spotifyTrack.name || "").toLowerCase().includes(q);
      const artistMatch = (track.spotifyTrack.artists || []).some((a) =>
        (a.name || "").toLowerCase().includes(q)
      );
      const albumMatch = (track.spotifyTrack.album?.name || "")
        .toLowerCase()
        .includes(q);
      if (!titleMatch && !artistMatch && !albumMatch) return false;
    }

    // Status tab filter
    if (filterTab === "selected") return track.selected;
    if (filterTab === "downloading")
      return ["searching", "found", "downloading", "converting"].includes(track.status);
    if (filterTab === "completed") return track.status === "done";
    if (filterTab === "failed") return track.status === "error";

    return true;
  });

  if (error) {
    return (
      <>
        <Navbar />
        <div className={styles.errorContainer}>
          <div className={styles.errorCard}>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#f87171" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <h2>Failed to Load</h2>
            <p>{error}</p>
            <SpotifyButton onClick={() => window.location.reload()} variant="secondary">
              Try Again
            </SpotifyButton>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Playlist Header */}
          {playlist && (
            <PlaylistHeader
              playlist={playlist}
              tracks={tracks}
              isLoading={loadingTracks}
            />
          )}

          {/* Clear Fetching Status */}
          {loadingTracks && (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinnerWrapper}>
                <div className={styles.loadingPulseRing} />
                <div className={styles.spinner} />
              </div>
              <h2 className={styles.loadingTitle}>Fetching Playlist Tracks...</h2>
              <p className={styles.loadingSubtitle}>
                {loadProgress.total > 0
                  ? `Loaded ${loadProgress.loaded} of ${loadProgress.total} songs`
                  : "Resolving metadata and preparing song queue..."}
              </p>
              {loadProgress.total > 0 && (
                <div className={styles.loadingProgressWrapper}>
                  <ProgressBar
                    value={(loadProgress.loaded / loadProgress.total) * 100}
                    size="sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* Main content after loading */}
          {!loadingTracks && tracks.length > 0 && (
            <>
              {isLimited && !loggedIn && (
                <div className={styles.embedWarning}>
                  <div className={styles.embedWarningLeft}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>
                      <strong>Spotify 100-Track Preview Limit:</strong> Public embed preview only loads up to 100 tracks. Connect your Spotify account to bypass the limit and load all {playlist?.tracks?.total || "127+"} songs.
                    </span>
                  </div>
                  <button
                    className={styles.loginBannerBtn}
                    onClick={() => initiateSpotifyAuth()}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.5 17.3c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.9-9.3-1-.4.1-.7-.1-.8-.5-.1-.4.1-.7.5-.8 4-.9 7.5-.5 10.3 1.2.3.2.4.6.2.9zm1.5-3.3c-.3.4-.8.5-1.2.3-3-1.8-7.5-2.4-11-1.3-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 4-1.2 9-.6 12.4 1.5.4.2.5.7.3 1zm.1-3.4C15.5 8.4 9.4 8.2 5.5 9.4c-.6.2-1.2-.2-1.4-.7-.2-.6.2-1.2.7-1.4 4.5-1.4 11.2-1.1 15.3 1.3.5.3.7 1 .4 1.5-.3.5-1 .7-1.4.4z"/>
                    </svg>
                    Connect with Spotify ({playlist?.tracks?.total || "127+"} Songs)
                  </button>
                </div>
              )}

              {/* Folder / Playlist Naming Settings */}
              <div className={styles.folderSettings}>
                <span className={styles.folderLabel}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  Save Folder / ZIP Name:
                </span>
                <input
                  type="text"
                  className={styles.folderInput}
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Enter playlist folder / ZIP archive name"
                />
                <span className={styles.folderHint}>
                  Numbered files (e.g. <code>01. Artist - Song.{format}</code>) saved directly to your device
                </span>
              </div>

              {/* Controls Bar */}
              <div className={styles.controls}>
                <div className={styles.controlsLeft}>
                  {!isRunning ? (
                    <>
                      <SpotifyButton
                        onClick={handleStartDownload}
                        size="lg"
                        icon={
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        }
                      >
                        Download {totalSelected} Songs (Save to Device)
                      </SpotifyButton>

                      {completedCount > 0 && (
                        <SpotifyButton
                          onClick={handleSaveZip}
                          variant="secondary"
                          size="lg"
                          icon={
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                              <line x1="12" y1="22.08" x2="12" y2="12" />
                            </svg>
                          }
                        >
                          Save Entire Playlist as ZIP ({completedCount})
                        </SpotifyButton>
                      )}

                      {failedCount > 0 && (
                        <button
                          className={styles.retryAllBtn}
                          onClick={handleRetryAllFailed}
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="1 4 1 10 7 10" />
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                          </svg>
                          Retry {failedCount} Failed
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <SpotifyButton
                        onClick={handlePause}
                        variant="secondary"
                        size="md"
                      >
                        {isPaused ? "▶ Resume" : "⏸ Pause"}
                      </SpotifyButton>
                      <SpotifyButton
                        onClick={handleCancel}
                        variant="ghost"
                        size="md"
                      >
                        ✕ Cancel
                      </SpotifyButton>
                    </>
                  )}
                </div>

                <div className={styles.controlsRight}>
                  <button
                    className={styles.selectBtn}
                    onClick={handleSelectAll}
                  >
                    Select All ({allCount})
                  </button>
                  <span className={styles.divider}>|</span>
                  <button
                    className={styles.selectBtn}
                    onClick={handleDeselectAll}
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Live Interactive Download Visualizer */}
              <LiveDownloadProgress
                isRunning={isRunning}
                isPaused={isPaused}
                completedCount={completedCount}
                totalSelected={totalSelected}
                failedCount={failedCount}
                format={format}
                quality={quality}
                tracks={queueTracks}
                onPauseToggle={handlePause}
                onCancel={handleCancel}
              />

              {/* Quality & Format Selector */}
              <div className={styles.qualitySection}>
                <QualitySelector
                  format={format}
                  quality={quality}
                  onFormatChange={handleFormatChange}
                  onQualityChange={handleQualityChange}
                  disabled={isRunning}
                />
              </div>

              {/* Live Search & Filter Bar */}
              <div className={styles.filterSearchSection}>
                <div className={styles.searchBarWrapper}>
                  <svg className={styles.searchIcon} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className={styles.searchInput}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search in this playlist (title, artist, album)..."
                  />
                  {searchQuery && (
                    <button
                      className={styles.clearSearchBtn}
                      onClick={() => setSearchQuery("")}
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className={styles.filterTabsWrapper}>
                  <div className={styles.filterTabs}>
                    <button
                      className={`${styles.filterTab} ${filterTab === "all" ? styles.filterTabActive : ""}`}
                      onClick={() => setFilterTab("all")}
                    >
                      All <span className={styles.filterBadge}>{allCount}</span>
                    </button>
                    <button
                      className={`${styles.filterTab} ${filterTab === "selected" ? styles.filterTabActive : ""}`}
                      onClick={() => setFilterTab("selected")}
                    >
                      Selected <span className={styles.filterBadge}>{selectedCount}</span>
                    </button>
                    {downloadingCount > 0 && (
                      <button
                        className={`${styles.filterTab} ${filterTab === "downloading" ? styles.filterTabActive : ""}`}
                        onClick={() => setFilterTab("downloading")}
                      >
                        In Progress <span className={styles.filterBadge}>{downloadingCount}</span>
                      </button>
                    )}
                    {doneCount > 0 && (
                      <button
                        className={`${styles.filterTab} ${filterTab === "completed" ? styles.filterTabActive : ""}`}
                        onClick={() => setFilterTab("completed")}
                      >
                        Completed <span className={styles.filterBadge}>{doneCount}</span>
                      </button>
                    )}
                    {errorCount > 0 && (
                      <button
                        className={`${styles.filterTab} ${filterTab === "failed" ? styles.filterTabActive : ""}`}
                        onClick={() => setFilterTab("failed")}
                      >
                        Failed <span className={styles.filterBadge}>{errorCount}</span>
                      </button>
                    )}
                  </div>

                  <span className={styles.filteredCountText}>
                    Showing {filteredTracks.length} of {allCount} songs
                  </span>
                </div>
              </div>

              {/* Track List Header */}
              <div className={styles.trackListHeader}>
                <span className={styles.colCheck}>#</span>
                <span className={styles.colNum}></span>
                <span className={styles.colArt}></span>
                <span className={styles.colTitle}>Title</span>
                <span className={styles.colAlbum}>Album</span>
                <span className={styles.colDuration}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </span>
                <span className={styles.colStatus}>Status</span>
              </div>

              {/* Track List */}
              {filteredTracks.length > 0 ? (
                <div className={styles.trackList}>
                  {filteredTracks.map((track, index) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={index}
                      onToggleSelect={handleToggleSelect}
                      onRetry={handleRetry}
                      onDownload={handleDownloadTrack}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyFilteredState}>
                  <p>No songs found matching your search or active filter.</p>
                  <SpotifyButton
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterTab("all");
                    }}
                  >
                    Reset Filter &amp; Search
                  </SpotifyButton>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function DownloadPage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    }>
      <DownloadContent playlistId={resolvedParams.playlistId} />
    </Suspense>
  );
}
