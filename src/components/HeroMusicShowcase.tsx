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
    id: "4VsP4Dm8gsibRxB5I2hEkw",
    title: "Kahani Suno 2.0",
    artist: "Kaifi Khalil",
    album: "Kahani Suno 2.0",
    duration: "2:53",
    spotifyUrl: "https://open.spotify.com/track/4VsP4Dm8gsibRxB5I2hEkw",
    coverImage: "/covers/kahani-suno.jpg",
    coverGradient: "linear-gradient(135deg, #d97706, #92400e, #451a03)",
    genre: "Coke Studio • Viral Hit",
    streams: "350M+ Streams",
  },
  {
    id: "7lvDsmTRXFE3dK4OjvRiWB",
    title: "Pasoori",
    artist: "Ali Sethi, Shae Gill",
    album: "Coke Studio 14",
    duration: "3:44",
    spotifyUrl: "https://open.spotify.com/track/7lvDsmTRXFE3dK4OjvRiWB",
    coverImage: "/covers/pasoori.jpg",
    coverGradient: "linear-gradient(135deg, #f59e0b, #d97706, #78350f)",
    genre: "Global Viral • Fusion",
    streams: "700M+ Streams",
  },
  {
    id: "3zSSCPpLZ5Oc8nelhhGjKz",
    title: "Tu Hai Kahan",
    artist: "AUR",
    album: "Tu Hai Kahan",
    duration: "4:23",
    spotifyUrl: "https://open.spotify.com/track/3zSSCPpLZ5Oc8nelhhGjKz",
    coverImage: "/covers/tu-hai-kahan.jpg",
    coverGradient: "linear-gradient(135deg, #db2777, #9d174d, #500724)",
    genre: "Pop • R&B Fusion",
    streams: "220M+ Streams",
  },
  {
    id: "5yqr66QIdRvhh5cxjgpkJh",
    title: "Downers at Dusk",
    artist: "Talha Anjum, Umair",
    album: "Open Letter",
    duration: "4:16",
    spotifyUrl: "https://open.spotify.com/track/5yqr66QIdRvhh5cxjgpkJh",
    coverImage: "/covers/downers-at-dusk.jpg",
    coverGradient: "linear-gradient(135deg, #4f46e5, #3730a3, #1e1b4b)",
    genre: "Desi Hip Hop",
    streams: "180M+ Streams",
  },
  {
    id: "6qrifdo7QINdPQr80IelGi",
    title: "Iraaday",
    artist: "Abdul Hannan, Rovalio",
    album: "Iraaday",
    duration: "2:13",
    spotifyUrl: "https://open.spotify.com/track/6qrifdo7QINdPQr80IelGi",
    coverImage: "/covers/iraaday.jpg",
    coverGradient: "linear-gradient(135deg, #0d9488, #115e59, #042f2e)",
    genre: "Indie Pop",
    streams: "160M+ Streams",
  },
  {
    id: "6mNBMtkOSZIKxAl4dNiDsP",
    title: "Wo Lamhe",
    artist: "KK",
    album: "Life In A Metro",
    duration: "4:12",
    spotifyUrl: "https://open.spotify.com/track/6mNBMtkOSZIKxAl4dNiDsP",
    coverImage: "/covers/faasle.jpg",
    coverGradient: "linear-gradient(135deg, #7c3aed, #5b21b6, #2e1065)",
    genre: "Indie Chill • Bollywood",
    streams: "140M+ Streams",
  },
  {
    id: "1JcXBnMHywJwBE0p02sSwL",
    title: "Tere Bina",
    artist: "Atif Aslam",
    album: "Doorie",
    duration: "5:07",
    spotifyUrl: "https://open.spotify.com/track/1JcXBnMHywJwBE0p02sSwL",
    coverImage: "/covers/bikhra.jpg",
    coverGradient: "linear-gradient(135deg, #0891b2, #155e75, #083344)",
    genre: "Acoustic Pop • Pakistani",
    streams: "150M+ Streams",
  },
  {
    id: "3Aysg8NUBsXDXJekmU3NDM",
    title: "Tera Hua",
    artist: "Atif Aslam",
    album: "Loveyatri",
    duration: "3:57",
    spotifyUrl: "https://open.spotify.com/track/3Aysg8NUBsXDXJekmU3NDM",
    coverImage: "/covers/ghalat-fehmi.jpg",
    coverGradient: "linear-gradient(135deg, #ef4444, #b91c1c, #450a0a)",
    genre: "OST • Romantic Hit",
    streams: "130M+ Streams",
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
