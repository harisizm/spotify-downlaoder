"use client";

import React from "react";
import styles from "./ZipPackagingModal.module.css";

interface ZipPackagingModalProps {
  isOpen: boolean;
  current: number;
  total: number;
  stepText: string;
  playlistName: string;
}

export default function ZipPackagingModal({
  isOpen,
  current,
  total,
  stepText,
  playlistName,
}: ZipPackagingModalProps) {
  if (!isOpen) return null;

  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modalCard}>
        {/* Ambient Glow */}
        <div className={styles.glowAura} />

        {/* Animated Archive Icon */}
        <div className={styles.iconContainer}>
          <div className={styles.pulseRing} />
          <div className={styles.iconCircle}>
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
        </div>

        {/* Title and Details */}
        <h3 className={styles.modalTitle}>Packaging Your ZIP Archive</h3>
        <p className={styles.playlistSubtitle}>
          <strong>{playlistName}</strong> ({total} tracks)
        </p>

        {/* Status Text */}
        <div className={styles.statusBox}>
          <div className={styles.spinner} />
          <span className={styles.statusText}>{stepText || "Preparing files..."}</span>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressBarWrapper}>
          <div className={styles.progressBarFill} style={{ width: `${percent}%` }}>
            <div className={styles.shimmer} />
          </div>
        </div>

        <div className={styles.progressInfoRow}>
          <span>{current} of {total} processed</span>
          <span className={styles.percentNumber}>{percent}%</span>
        </div>

        {/* Helper Note */}
        <p className={styles.hintNote}>
          ✨ Building archive in memory. Your browser will prompt the download automatically in a moment!
        </p>
      </div>
    </div>
  );
}
