"use client";

import React from "react";
import styles from "./SpotifyConnectGameModal.module.css";

interface SpotifyConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SpotifyConnectGameModal({
  isOpen,
  onClose,
}: SpotifyConnectModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.glowAura} />

        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className={styles.visualWrapper}>
          <div className={styles.vinylDisc}>
            <div className={styles.vinylCenter}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.5 17.3c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.9-9.3-1-.4.1-.7-.1-.8-.5-.1-.4.1-.7.5-.8 4-.9 7.5-.5 10.3 1.2.3.2.4.6.2.9zm1.5-3.3c-.3.4-.8.5-1.2.3-3-1.8-7.5-2.4-11-1.3-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 4-1.2 9-.6 12.4 1.5.4.2.5.7.3 1zm.1-3.4C15.5 8.4 9.4 8.2 5.5 9.4c-.6.2-1.2-.2-1.4-.7-.2-.6.2-1.2.7-1.4 4.5-1.4 11.2-1.1 15.3 1.3.5.3.7 1 .4 1.5-.3.5-1 .7-1.4.4z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Animated Sound Equalizer */}
        <div className={styles.equalizerWave}>
          <span className={styles.equalizerBar} />
          <span className={styles.equalizerBar} />
          <span className={styles.equalizerBar} />
          <span className={styles.equalizerBar} />
          <span className={styles.equalizerBar} />
          <span className={styles.equalizerBar} />
          <span className={styles.equalizerBar} />
        </div>

        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          Under Active Development
        </div>

        <h2 className={styles.title}>Direct Spotify Sync</h2>
        <p className={styles.subtitle}>
          Direct Spotify account login and private playlist syncing are currently being built.
        </p>

        <div className={styles.infoCard}>
          💡 <strong>No Login Required:</strong> You can download any public playlist, album, or track right now. Just paste the Spotify link into the downloader on the home page.
        </div>

        <button className={styles.modalActionBtn} onClick={onClose}>
          Back to Downloader
        </button>
      </div>
    </div>
  );
}
