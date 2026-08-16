"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SpotifyButton from "@/components/SpotifyButton";
import {
  isTokenValid,
  getSpotifyProfile,
  initiateSpotifyAuth,
  type SpotifyUserProfile,
} from "@/lib/spotify-auth";
import {
  parseSpotifyUrl,
  getUserPlaylists,
  getBestImage,
  type SpotifyPlaylistInfo,
} from "@/lib/spotify-api";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SpotifyUserProfile | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylistInfo[]>([]);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [loading, setLoading] = useState(true);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);

  useEffect(() => {
    if (!isTokenValid()) {
      router.push("/");
      return;
    }

    getSpotifyProfile()
      .then((profile) => {
        setUser(profile);
        setLoading(false);
      })
      .catch(() => {
        router.push("/");
      });

    getUserPlaylists()
      .then((lists) => {
        setPlaylists(lists);
        setPlaylistsLoading(false);
      })
      .catch(() => setPlaylistsLoading(false));
  }, []);

  const handleUrlSubmit = () => {
    const parsed = parseSpotifyUrl(url);
    if (!parsed) {
      setUrlError("Please enter a valid Spotify URL");
      return;
    }
    setUrlError("");
    router.push(`/download/${parsed.id}?type=${parsed.type}`);
  };

  const handlePlaylistClick = (playlist: SpotifyPlaylistInfo) => {
    router.push(`/download/${playlist.id}?type=playlist`);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Loading your profile...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Welcome Header */}
          <div className={styles.welcome}>
            <div className={styles.welcomeInfo}>
              <h1 className={styles.welcomeTitle}>
                Welcome back,{" "}
                <span className={styles.nameGradient}>
                  {user?.display_name || "there"}
                </span>
              </h1>
              <p className={styles.welcomeSubtitle}>
                Paste a Spotify URL or select one of your playlists to get started.
              </p>
            </div>
          </div>

          {/* URL Input Section */}
          <div className={styles.urlSection}>
            <div className={`${styles.urlInput} ${urlError ? styles.urlInputError : ""}`}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className={styles.urlIcon}>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <input
                type="text"
                placeholder="Paste any Spotify playlist, album, or track URL..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setUrlError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                className={styles.urlTextField}
                id="dashboard-url-input"
              />
              <SpotifyButton onClick={handleUrlSubmit} size="md">
                Go
              </SpotifyButton>
            </div>
            {urlError && <p className={styles.urlError}>{urlError}</p>}
          </div>

          {/* User's Playlists */}
          <section className={styles.playlistsSection}>
            <h2 className={styles.sectionTitle}>Your Playlists</h2>

            {playlistsLoading ? (
              <div className={styles.playlistsGrid}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={styles.playlistSkeleton}>
                    <div className={styles.skeletonCover} />
                    <div className={styles.skeletonTitle} />
                    <div className={styles.skeletonMeta} />
                  </div>
                ))}
              </div>
            ) : playlists.length > 0 ? (
              <div className={styles.playlistsGrid}>
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    className={styles.playlistCard}
                    onClick={() => handlePlaylistClick(playlist)}
                  >
                    <div className={styles.playlistCoverWrap}>
                      {playlist.images?.[0] ? (
                        <img
                          src={getBestImage(playlist.images, "medium")}
                          alt={playlist.name}
                          className={styles.playlistCover}
                        />
                      ) : (
                        <div className={styles.playlistCoverPlaceholder}>
                          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9 18V5l12-2v13" />
                            <circle cx="6" cy="18" r="3" />
                            <circle cx="18" cy="16" r="3" />
                          </svg>
                        </div>
                      )}
                      <div className={styles.playBtn}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </div>
                    </div>
                    <h3 className={styles.playlistName}>{playlist.name}</h3>
                    <p className={styles.playlistMeta}>
                      {playlist.tracks.total} songs
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className={styles.emptyText}>No playlists found.</p>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
