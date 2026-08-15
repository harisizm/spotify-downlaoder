"use client";

import React, { useState } from "react";
import styles from "./HeroMusicShowcase.module.css";

export interface TrendingTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  spotifyUrl: string;
  coverGradient: string;
  genre: string;
  streams: string;
}

const TRENDING_PAKISTANI_HITS: TrendingTrack[] = [
  {
    id: "kahani-suno",
    title: "Kahani Suno 2.0",
    artist: "Kaifi Khalil",
    album: "Kahani Suno",
    duration: "2:54",
    spotifyUrl: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
    coverGradient: "linear-gradient(135deg, #f59e0b, #d97706, #78350f)",
    genre: "Coke Studio • Top 50",
    streams: "350M+ Streams",
  },
  {
    id: "pasoori",
    title: "Pasoori",
    artist: "Ali Sethi, Shae Gill",
    album: "Coke Studio Season 14",
    duration: "3:44",
    spotifyUrl: "https://open.spotify.com/track/4jVnrhdY4e7pB21g138PkW",
    coverGradient: "linear-gradient(135deg, #10b981, #059669, #064e3b)",
    genre: "Global Viral • Fusion",
    streams: "700M+ Streams",
  },
  {
    id: "tu-hai-kahan",
    title: "Tu Hai Kahan",
    artist: "AUR, Zayn Malik",
    album: "Tu Hai Kahan",
    duration: "4:12",
    spotifyUrl: "https://open.spotify.com/track/5cODp2vR1H9vVb2d56V1kP",
    coverGradient: "linear-gradient(135deg, #ec4899, #db2777, #831843)",
    genre: "Pop • R&B",
    streams: "200M+ Streams",
  },
  {
    id: "downers-at-dusk",
    title: "Downers At Dusk",
    artist: "Talha Anjum, Umair",
    album: "Open Letter",
    duration: "4:05",
    spotifyUrl: "https://open.spotify.com/track/733jLzM3R1F7pGZ6XzV6e7",
    coverGradient: "linear-gradient(135deg, #6366f1, #4f46e5, #312e81)",
    genre: "Desi Hip Hop",
    streams: "180M+ Streams",
  },
  {
    id: "iraaday",
    title: "Iraaday",
    artist: "Abdul Hannan, Rovalio",
    album: "Iraaday",
    duration: "3:18",
    spotifyUrl: "https://open.spotify.com/track/3bH8dF8yQ93jQvR2rV6nE4",
    coverGradient: "linear-gradient(135deg, #14b8a6, #0d9488, #134e4a)",
    genre: "Indie Pop",
    streams: "160M+ Streams",
  },
  {
    id: "faasle",
    title: "Faasle",
    artist: "Aditya Rikhari, Shamoon Ismail",
    album: "Faasle Single",
    duration: "3:30",
    spotifyUrl: "https://open.spotify.com/track/2y4Z1y5vH5jN5k4n8vR2aB",
    coverGradient: "linear-gradient(135deg, #8b5cf6, #7c3aed, #4c1d95)",
    genre: "Indie Chill",
    streams: "120M+ Streams",
  },
  {
    id: "bikhra",
    title: "Bikhra",
    artist: "Abdul Hannan, Rovalio",
    album: "Bikhra",
    duration: "3:40",
    spotifyUrl: "https://open.spotify.com/track/1a2b3c4d5e6f7g8h9i0j",
    coverGradient: "linear-gradient(135deg, #06b6d4, #0891b2, #164e63)",
    genre: "Acoustic Pop",
    streams: "140M+ Streams",
  },
];

interface HeroMusicShowcaseProps {
  onSelectTrack: (url: string) => void;
}

export default function HeroMusicShowcase({ onSelectTrack }: HeroMusicShowcaseProps) {
  const [activeCard, setActiveCard] = useState<string | null>(null);

  return (
    <div className={styles.showcaseSection}>
      <div className={styles.sectionHeader}>
        <div className={styles.headerTag}>
          <span className={styles.tagDot} />
          <span>TOP PAKISTANI &amp; VIRAL CHARTS</span>
        </div>
        <h3 className={styles.sectionTitle}>
          Instant 1-Click Samples • Powered by SpotDown
        </h3>
        <p className={styles.sectionSubtitle}>
          Click any song card below to auto-load and download in studio-grade 320kbps audio.
        </p>
      </div>

      <div className={styles.carouselWrapper}>
        <div className={styles.marqueeTrack}>
          {/* Duplicate list for seamless infinite loop */}
          {[...TRENDING_PAKISTANI_HITS, ...TRENDING_PAKISTANI_HITS].map((track, idx) => (
            <div
              key={`${track.id}-${idx}`}
              className={`${styles.musicCard} ${activeCard === `${track.id}-${idx}` ? styles.cardActive : ""}`}
              onMouseEnter={() => setActiveCard(`${track.id}-${idx}`)}
              onMouseLeave={() => setActiveCard(null)}
              onClick={() => onSelectTrack(track.spotifyUrl)}
              role="button"
              tabIndex={0}
              title={`Download "${track.title}" by ${track.artist}`}
            >
              {/* Vinyl Disc Animation Effect */}
              <div className={styles.vinylContainer}>
                <div className={styles.vinylDisc}>
                  <div className={styles.vinylGrooves} />
                  <div className={styles.vinylCenter} style={{ background: track.coverGradient }} />
                </div>
              </div>

              {/* Card Artwork & Visual */}
              <div className={styles.cardCover} style={{ background: track.coverGradient }}>
                <div className={styles.genreBadge}>{track.genre}</div>
                <div className={styles.coverPlayOverlay}>
                  <svg className={styles.playIcon} viewBox="0 0 24 24" width="22" height="22" fill="#000">
                    <polygon points="6 4 20 12 6 20 6 4" />
                  </svg>
                </div>
                {/* Equalizer Bars */}
                <div className={styles.equalizer}>
                  <span className={styles.eqBar} style={{ animationDelay: "0.1s" }} />
                  <span className={styles.eqBar} style={{ animationDelay: "0.3s" }} />
                  <span className={styles.eqBar} style={{ animationDelay: "0.2s" }} />
                  <span className={styles.eqBar} style={{ animationDelay: "0.4s" }} />
                </div>
              </div>

              {/* Card Meta Details */}
              <div className={styles.cardDetails}>
                <div className={styles.cardHeaderRow}>
                  <h4 className={styles.trackTitle}>{track.title}</h4>
                  <span className={styles.trackDuration}>{track.duration}</span>
                </div>
                <p className={styles.trackArtist}>{track.artist}</p>
                <div className={styles.cardFooterRow}>
                  <span className={styles.streamBadge}>{track.streams}</span>
                  <span className={styles.quickDownloadCta}>
                    <span>Load</span>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
