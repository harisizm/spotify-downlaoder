"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SpotifyButton from "@/components/SpotifyButton";
import HeroMusicShowcase from "@/components/HeroMusicShowcase";
import { initiateSpotifyAuth, isTokenValid } from "@/lib/spotify-auth";
import { parseSpotifyUrl } from "@/lib/spotify-api";
import styles from "./page.module.css";

export default function LandingPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(isTokenValid());
  }, []);

  const handleUrlSubmit = (customUrl?: string) => {
    const targetUrl = customUrl || url;
    const parsed = parseSpotifyUrl(targetUrl);
    if (!parsed) {
      setUrlError("Please enter a valid Spotify playlist, album, or track URL");
      return;
    }
    setUrlError("");
    router.push(`/download/${parsed.id}?type=${parsed.type}`);
  };

  const handleSelectSampleTrack = (sampleUrl: string) => {
    setUrl(sampleUrl);
    setUrlError("");
    handleUrlSubmit(sampleUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleUrlSubmit();
  };

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          {/* Animated background elements */}
          <div className={styles.bgOrbs}>
            <div className={styles.orb1} />
            <div className={styles.orb2} />
            <div className={styles.orb3} />
          </div>
          <div className={styles.gridOverlay} />

          <div className={styles.heroContent}>
            <div className={styles.badge}>
              <span className={styles.badgeDot} />
              Pakistani Passion • Developer Precision • by harisizm
            </div>

            <h1 className={styles.title}>
              Welcome to
              <br />
              <span className={styles.titleGradient}>Pasooriizm</span>
            </h1>

            <p className={styles.subtitle}>
              The ultimate Spotify audio vault. Unlimited tracks • Studio 320kbps • MP3, M4A, OPUS, WAV.
              <br />
              <strong>⚡ Fetch</strong> audio to browser, then <strong>💾 Save</strong> entire organized ZIPs directly to your device storage.
            </p>

            {/* URL Input */}
            <div className={styles.inputWrapper}>
              <div className={`${styles.inputContainer} ${urlError ? styles.inputError : ""}`}>
                <svg className={styles.inputIcon} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Paste Spotify playlist, album, or track URL..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setUrlError("");
                  }}
                  onKeyDown={handleKeyDown}
                  className={styles.input}
                  id="spotify-url-input"
                />
                <SpotifyButton onClick={() => handleUrlSubmit()} size="md">
                  Load Tracks
                </SpotifyButton>
              </div>
              {urlError && <p className={styles.errorText}>{urlError}</p>}
            </div>

            {/* Optional Login CTA */}
            {!isLoggedIn && (
              <div className={styles.loginCta}>
                <span className={styles.loginText}>Need private playlists or full 100+ pagination?</span>
                <button className={styles.loginLink} onClick={() => initiateSpotifyAuth()}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  Connect with Spotify
                </button>
              </div>
            )}

            {/* Dynamic Pakistani & Global Viral Hits Carousel */}
            <HeroMusicShowcase onSelectTrack={handleSelectSampleTrack} />
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.features}>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                  <path d="M12 12v9" />
                  <path d="m8 17 4 4 4-4" />
                </svg>
              </div>
              <h3 className={styles.featureTitle}>Unlimited Downloads</h3>
              <p className={styles.featureDesc}>
                No 100-song limit. Download massive playlists with 500, 1000, or 5000+ tracks. We paginate through every single track.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              </div>
              <h3 className={styles.featureTitle}>Studio-Grade Bitrate</h3>
              <p className={styles.featureDesc}>
                Choose 128, 192, 256, or crisp 320 kbps. Pick MP3, M4A, OPUS, or lossless WAV transcodes.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <h3 className={styles.featureTitle}>Lightning Pipeline</h3>
              <p className={styles.featureDesc}>
                Parallel download engine streams 3 to 5 songs concurrently directly into your browser with live cooking status.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <h3 className={styles.featureTitle}>1-Click ZIP Archiving</h3>
              <p className={styles.featureDesc}>
                Auto-numbers and tags every song (e.g. <code>01. Artist - Title.mp3</code>) and exports the whole collection straight to your device.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section: Explaining Fetch vs Save */}
        <section className={styles.howItWorks}>
          <h2 className={styles.sectionTitle}>How the Pasooriizm Pipeline Works</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h3 className={styles.stepTitle}>Paste Spotify Link</h3>
              <p className={styles.stepDesc}>
                Paste any playlist, album, or track URL to parse metadata in seconds.
              </p>
            </div>
            <div className={styles.stepConnector}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h3 className={styles.stepTitle}>⚡ Fetch &amp; Stream</h3>
              <p className={styles.stepDesc}>
                Fetches high-bitrate audio stream into browser memory with live transcoding.
              </p>
            </div>
            <div className={styles.stepConnector}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h3 className={styles.stepTitle}>💾 Save to Device (ZIP)</h3>
              <p className={styles.stepDesc}>
                Exports the entire organized playlist as a numbered ZIP file directly to your storage.
              </p>
            </div>
          </div>
        </section>

        {/* Global Footer with Developed by harisizm Badge */}
        <Footer />
      </main>
    </>
  );
}

