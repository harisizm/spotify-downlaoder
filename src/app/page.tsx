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
        {/* Uncluttered Hero Section */}
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
              Engineered by harisizm
            </div>

            <h1 className={styles.title}>
              Studio Quality
              <br />
              <span className={styles.titleGradient}>Spotify Downloads</span>
            </h1>

            <p className={styles.subtitle}>
              Fast, uncapped playlist downloads in 320kbps MP3 and lossless WAV.
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
                  placeholder="Paste Spotify playlist, album, or track link..."
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
                  Download
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

        {/* Visual Workflow Flowchart */}
        <section className={styles.flowchartSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>How It Works</span>
            <h2 className={styles.sectionTitle}>Four Step Audio Pipeline</h2>
          </div>

          <div className={styles.flowDiagram}>
            <div className={styles.flowCard}>
              <span className={styles.flowStepNum}>STEP 01</span>
              <div className={styles.flowIconWrapper}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <h3 className={styles.flowTitle}>Paste Link</h3>
              <p className={styles.flowSub}>Playlists, Albums, Tracks</p>
            </div>

            <div className={styles.flowCard}>
              <span className={styles.flowStepNum}>STEP 02</span>
              <div className={styles.flowIconWrapper}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              </div>
              <h3 className={styles.flowTitle}>Choose Audio</h3>
              <p className={styles.flowSub}>320kbps MP3 or WAV</p>
            </div>

            <div className={styles.flowCard}>
              <span className={styles.flowStepNum}>STEP 03</span>
              <div className={styles.flowIconWrapper}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <h3 className={styles.flowTitle}>Batch Process</h3>
              <p className={styles.flowSub}>5x Parallel Conversion</p>
            </div>

            <div className={styles.flowCard}>
              <span className={styles.flowStepNum}>STEP 04</span>
              <div className={styles.flowIconWrapper}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <h3 className={styles.flowTitle}>Export ZIP</h3>
              <p className={styles.flowSub}>Numbered Local Files</p>
            </div>
          </div>
        </section>

        {/* Visual Spec Matrix Grid */}
        <section className={styles.specsSection}>
          <div className={styles.specsGrid}>
            <div className={styles.specCard}>
              <span className={styles.specLabel}>Bitrate Fidelity</span>
              <span className={styles.specValue}>320 kbps &amp; WAV</span>
              <span className={styles.specTag}>Pure Uncompressed Audio</span>
            </div>

            <div className={styles.specCard}>
              <span className={styles.specLabel}>Playlist Capacity</span>
              <span className={styles.specValue}>10,000+ Tracks</span>
              <span className={styles.specTag}>Unrestricted Pagination</span>
            </div>

            <div className={styles.specCard}>
              <span className={styles.specLabel}>Engine Throughput</span>
              <span className={styles.specValue}>Multi-Stream</span>
              <span className={styles.specTag}>Parallel Track Transcoding</span>
            </div>

            <div className={styles.specCard}>
              <span className={styles.specLabel}>Archive Packaging</span>
              <span className={styles.specValue}>Numbered ZIP</span>
              <span className={styles.specTag}>ID3 Tags &amp; Album Artwork</span>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}
