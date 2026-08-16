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

        {/* How It Works — Clean numbered story, NOT features */}
        <section className={styles.flowchartSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>How It Works</span>
            <h2 className={styles.sectionTitle}>Three clicks. Whole playlist. Done.</h2>
          </div>

          <div className={styles.flowDiagram}>
            <div className={styles.flowCard}>
              <span className={styles.flowStepNum}>01</span>
              <div className={styles.flowIconWrapper}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <h3 className={styles.flowTitle}>Paste the Spotify link</h3>
              <p className={styles.flowSub}>Any playlist, album, or single track. Just copy from Spotify and drop it in the box above.</p>
            </div>

            <div className={styles.flowCard}>
              <span className={styles.flowStepNum}>02</span>
              <div className={styles.flowIconWrapper}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              </div>
              <h3 className={styles.flowTitle}>Pick your format</h3>
              <p className={styles.flowSub}>Choose 320kbps MP3 for streaming quality, or WAV if you're going full audiophile mode. No wrong answer.</p>
            </div>

            <div className={styles.flowCard}>
              <span className={styles.flowStepNum}>03</span>
              <div className={styles.flowIconWrapper}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <h3 className={styles.flowTitle}>Hit Download, then Save</h3>
              <p className={styles.flowSub}>Songs download into your browser. When they're all ready, save the whole playlist as a neat, numbered ZIP on your device.</p>
            </div>

            <div className={styles.flowCard}>
              <span className={styles.flowStepNum}>🎵</span>
              <div className={styles.flowIconWrapper}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <h3 className={styles.flowTitle}>Listen forever</h3>
              <p className={styles.flowSub}>Files live on your device. No app needed. No internet required. Your music, your way, always.</p>
            </div>
          </div>
        </section>

        {/* Under the Hood — Funny technical specs, clearly different vibe */}
        <section className={styles.specsSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>Under the Hood</span>
            <h2 className={styles.sectionTitle}>Nerd stuff you'll want to brag about</h2>
          </div>
          <div className={styles.specsGrid}>
            <div className={styles.specCard}>
              <span className={styles.specEmoji}>🔊</span>
              <span className={styles.specLabel}>No Lossy Compression Drama</span>
              <span className={styles.specValue}>320kbps MP3 + Lossless WAV</span>
              <span className={styles.specTag}>Your ears deserve better than YouTube's 128kbps. We deliver.</span>
            </div>

            <div className={styles.specCard}>
              <span className={styles.specEmoji}>⚡</span>
              <span className={styles.specLabel}>Parallel Download Engine</span>
              <span className={styles.specValue}>5 Songs at Once</span>
              <span className={styles.specTag}>While your friend's downloader sneezes on track 3, we're already at track 8.</span>
            </div>

            <div className={styles.specCard}>
              <span className={styles.specEmoji}>♾️</span>
              <span className={styles.specLabel}>Zero Track Limit</span>
              <span className={styles.specValue}>10,000+ Tracks</span>
              <span className={styles.specTag}>That 4,000-song mega playlist? Fine. The entire Coke Studio archive? Also fine.</span>
            </div>

            <div className={styles.specCard}>
              <span className={styles.specEmoji}>📦</span>
              <span className={styles.specLabel}>Auto-Organized ZIP Archive</span>
              <span className={styles.specValue}>Named + Numbered</span>
              <span className={styles.specTag}><code>01. Atif Aslam - Aadat.mp3</code> — not a chaotic mess of unnamed files.</span>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}
