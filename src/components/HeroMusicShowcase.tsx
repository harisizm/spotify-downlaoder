"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./HeroMusicShowcase.module.css";

export interface TrendingTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  spotifyUrl: string;
  coverImage: string;
  coverGradient: string;
  genre: string;
  streams: string;
}

const TRENDING_PAKISTANI_HITS: TrendingTrack[] = [
  {
    id: "4cOdK2wGLETKBW3PvgPWqT",
    title: "Kahani Suno 2.0",
    artist: "Kaifi Khalil",
    album: "Kahani Suno",
    duration: "2:54",
    spotifyUrl: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
    coverImage: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e029e8d48f27391ce383862b8e8",
    coverGradient: "linear-gradient(135deg, #d97706, #92400e, #451a03)",
    genre: "Coke Studio • Viral Hit",
    streams: "350M+ Streams",
  },
  {
    id: "3ouNEk0tv5TTi8VWMe1xbX",
    title: "Pasoori",
    artist: "Ali Sethi, Shae Gill",
    album: "Coke Studio 14",
    duration: "3:44",
    spotifyUrl: "https://open.spotify.com/track/3ouNEk0tv5TTi8VWMe1xbX",
    coverImage: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e029e8d48f27391ce383862b8e8",
    coverGradient: "linear-gradient(135deg, #059669, #047857, #064e3b)",
    genre: "Global Viral • Fusion",
    streams: "700M+ Streams",
  },
  {
    id: "4LfCY65LvojKjWEnU7fNN4",
    title: "Tu Hai Kahan",
    artist: "AUR, Zayn Malik",
    album: "Tu Hai Kahan",
    duration: "4:12",
    spotifyUrl: "https://open.spotify.com/track/4LfCY65LvojKjWEnU7fNN4",
    coverImage: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e025cf234eeb7a2edf44bf64a46",
    coverGradient: "linear-gradient(135deg, #db2777, #9d174d, #500724)",
    genre: "Pop • R&B Fusion",
    streams: "220M+ Streams",
  },
  {
    id: "70pVCVMGjmIWPbWXDwf11e",
    title: "Downers At Dusk",
    artist: "Talha Anjum, Umair",
    album: "Open Letter",
    duration: "4:05",
    spotifyUrl: "https://open.spotify.com/track/70pVCVMGjmIWPbWXDwf11e",
    coverImage: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e028baf677ee2d8dda6cc9fcbd7",
    coverGradient: "linear-gradient(135deg, #4f46e5, #3730a3, #1e1b4b)",
    genre: "Desi Hip Hop",
    streams: "180M+ Streams",
  },
  {
    id: "0kosUz0jePvjiz4ctmR6wL",
    title: "Iraaday",
    artist: "Abdul Hannan, Rovalio",
    album: "Iraaday",
    duration: "3:18",
    spotifyUrl: "https://open.spotify.com/track/0kosUz0jePvjiz4ctmR6wL",
    coverImage: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0203cadf1b3fe324c1dc710ed4",
    coverGradient: "linear-gradient(135deg, #0d9488, #115e59, #042f2e)",
    genre: "Indie Pop",
    streams: "160M+ Streams",
  },
  {
    id: "5s50vIGQHK8FG8LfSdHC5q",
    title: "Faasle",
    artist: "Aditya Rikhari, Shamoon",
    album: "Faasle",
    duration: "3:30",
    spotifyUrl: "https://open.spotify.com/track/5s50vIGQHK8FG8LfSdHC5q",
    coverImage: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0225a647ace83ba32770ab5d0f",
    coverGradient: "linear-gradient(135deg, #7c3aed, #5b21b6, #2e1065)",
    genre: "Indie Chill",
    streams: "140M+ Streams",
  },
  {
    id: "6oUUmBcUbZa5O48V5pjgAD",
    title: "Bikhra",
    artist: "Abdul Hannan, Rovalio",
    album: "Bikhra",
    duration: "3:40",
    spotifyUrl: "https://open.spotify.com/track/6oUUmBcUbZa5O48V5pjgAD",
    coverImage: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e025631546bdc010851494d88ba",
    coverGradient: "linear-gradient(135deg, #0891b2, #155e75, #083344)",
    genre: "Acoustic Pop",
    streams: "150M+ Streams",
  },
  {
    id: "37i9dQZF1DXcBWIGoYBM5M",
    title: "Today's Top Hits (50 Songs)",
    artist: "Spotify Curated",
    album: "Global Playlist",
    duration: "50 Tracks",
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    coverImage: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e020af5edf88b6f19f1205ecf1e",
    coverGradient: "linear-gradient(135deg, #10b981, #059669, #022c22)",
    genre: "Top 50 Playlist",
    streams: "34M+ Likes",
  },
];

interface HeroMusicShowcaseProps {
  onSelectTrack: (url: string) => void;
}

export default function HeroMusicShowcase({ onSelectTrack }: HeroMusicShowcaseProps) {
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isMouseDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const hasDragged = useRef(false);

  // Scroll controls (Left / Right)
  const handleScroll = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = direction === "left" ? -320 : 320;
    carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  // Mouse Drag to Scroll Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    isMouseDown.current = true;
    hasDragged.current = false;
    startX.current = e.pageX - carouselRef.current.offsetLeft;
    scrollLeft.current = carouselRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown.current || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; // Drag sensitivity
    if (Math.abs(walk) > 5) {
      hasDragged.current = true;
    }
    carouselRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isMouseDown.current = false;
  };

  const handleCardClick = (track: TrendingTrack) => {
    // If the user was dragging/swiping, do not trigger click navigation
    if (hasDragged.current) return;
    onSelectTrack(track.spotifyUrl);
  };

  return (
    <div className={styles.showcaseSection}>
      <div className={styles.sectionHeader}>
        <div className={styles.headerTag}>
          <span className={styles.tagDot} />
          <span>TOP PAKISTANI &amp; VIRAL CHARTS</span>
        </div>
        <h3 className={styles.sectionTitle}>
          Instant 1-Click Samples • Touch &amp; Drag
        </h3>
        <p className={styles.sectionSubtitle}>
          Swipe left/right or click any song below to instantly download in studio-grade audio.
        </p>

        {/* Navigation Arrow Controls */}
        <div className={styles.controlsRow}>
          <button
            className={styles.scrollBtn}
            onClick={() => handleScroll("left")}
            aria-label="Scroll left"
            title="Scroll left"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className={styles.scrollHint}>Drag to explore • Click to download</span>
          <button
            className={styles.scrollBtn}
            onClick={() => handleScroll("right")}
            aria-label="Scroll right"
            title="Scroll right"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={styles.carouselWrapper}
        ref={carouselRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        <div className={styles.cardsRow}>
          {TRENDING_PAKISTANI_HITS.map((track) => (
            <div
              key={track.id}
              className={`${styles.musicCard} ${activeCard === track.id ? styles.cardActive : ""}`}
              onMouseEnter={() => setActiveCard(track.id)}
              onMouseLeave={() => setActiveCard(null)}
              onClick={() => handleCardClick(track)}
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
                {track.coverImage ? (
                  <img
                    src={track.coverImage}
                    alt={track.title}
                    className={styles.coverImage}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : null}
                <div className={styles.coverOverlayGradient} />
                <div className={styles.genreBadge}>{track.genre}</div>

                <div className={styles.coverPlayOverlay}>
                  <svg className={styles.playIcon} viewBox="0 0 24 24" width="20" height="20" fill="#000">
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
                    <span>Download</span>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 5v14M5 12l7 7 7-7" />
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
