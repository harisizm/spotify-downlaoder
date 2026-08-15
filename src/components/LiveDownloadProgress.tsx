"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { DownloadTrack, AudioFormat, AudioQuality } from "@/lib/download-queue";
import styles from "./LiveDownloadProgress.module.css";

interface LiveDownloadProgressProps {
  isRunning: boolean;
  isPaused: boolean;
  completedCount: number;
  totalSelected: number;
  failedCount: number;
  format: AudioFormat;
  quality: AudioQuality;
  tracks: DownloadTrack[];
  onPauseToggle: () => void;
  onCancel: () => void;
}

const FUN_STATUS_MESSAGES = [
  "⚡ Preparing your downloads...",
  "🔍 Finding best matching audio tracks...",
  "⬇️ Downloading audio files...",
  "🎛️ Converting audio and embedding album art...",
  "📦 Organizing songs into files...",
  "🎧 Getting your songs ready for listening...",
  "💾 Finalizing your downloads...",
];

export default function LiveDownloadProgress({
  isRunning,
  isPaused,
  completedCount,
  totalSelected,
  failedCount,
  format,
  quality,
  tracks,
  onPauseToggle,
  onCancel,
}: LiveDownloadProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [statusMessageIndex, setStatusMessageIndex] = useState(0);
  const [justFinished, setJustFinished] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Calculate live progress percentage
  const progressPercent = useMemo(() => {
    if (totalSelected === 0) return 0;
    // Account for partial progress of actively downloading tracks
    const inProgressTracks = tracks.filter((t) =>
      t.selected && ["searching", "found", "downloading", "converting"].includes(t.status)
    );
    const partialSum = inProgressTracks.reduce((acc, t) => acc + (t.progress || 0) / 100, 0);
    const totalDone = completedCount + partialSum;
    return Math.min(100, Math.max(0, (totalDone / totalSelected) * 100));
  }, [completedCount, totalSelected, tracks]);

  // Find the song currently being actively downloaded / processed
  const currentActiveTrack = useMemo(() => {
    return tracks.find(
      (t) => t.selected && ["downloading", "converting", "searching"].includes(t.status)
    );
  }, [tracks]);

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  // Reset timer when a fresh run begins
  useEffect(() => {
    if (isRunning && completedCount === 0) {
      setElapsedSeconds(0);
      setJustFinished(false);
      setShowCelebration(false);
    }
  }, [isRunning, completedCount]);

  // Rotate fun status messages every 3.5 seconds while running
  useEffect(() => {
    let msgInterval: NodeJS.Timeout;
    if (isRunning && !isPaused) {
      msgInterval = setInterval(() => {
        setStatusMessageIndex((prev) => (prev + 1) % FUN_STATUS_MESSAGES.length);
      }, 3500);
    }
    return () => clearInterval(msgInterval);
  }, [isRunning, isPaused]);

  // Handle completion state & celebration banner
  useEffect(() => {
    if (!isRunning && completedCount > 0 && completedCount + failedCount >= totalSelected) {
      setJustFinished(true);
      setShowCelebration(true);
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [isRunning, completedCount, failedCount, totalSelected]);

  // Format elapsed time (mm:ss)
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}:${remSecs < 10 ? "0" : ""}${remSecs}`;
  };

  // Don't render if completely idle and not showing celebration
  if (!isRunning && !showCelebration) {
    return null;
  }

  return (
    <div className={`${styles.container} ${showCelebration && !isRunning ? styles.containerCelebration : ""}`}>
      {/* Background ambient glow aura */}
      <div className={styles.glowAura} />

      {/* Header section with status text and equalizer */}
      <div className={styles.headerRow}>
        <div className={styles.statusLeft}>
          <div className={styles.equalizer}>
            <span className={`${styles.eqBar} ${isPaused ? styles.eqPaused : ""}`} style={{ animationDelay: "0.1s" }} />
            <span className={`${styles.eqBar} ${isPaused ? styles.eqPaused : ""}`} style={{ animationDelay: "0.4s" }} />
            <span className={`${styles.eqBar} ${isPaused ? styles.eqPaused : ""}`} style={{ animationDelay: "0.2s" }} />
            <span className={`${styles.eqBar} ${isPaused ? styles.eqPaused : ""}`} style={{ animationDelay: "0.5s" }} />
            <span className={`${styles.eqBar} ${isPaused ? styles.eqPaused : ""}`} style={{ animationDelay: "0.3s" }} />
          </div>

          <div className={styles.statusTextGroup}>
            <span className={styles.mainStatus}>
              {showCelebration && !isRunning ? (
                "🎉 Downloads Complete & Saved!"
              ) : isPaused ? (
                "⏸️ Downloads Paused"
              ) : (
                FUN_STATUS_MESSAGES[statusMessageIndex]
              )}
            </span>
            {currentActiveTrack && !isPaused && isRunning && (
              <span className={styles.activeTrackPill}>
                Downloading: <strong>{currentActiveTrack.spotifyTrack.name}</strong> •{" "}
                {currentActiveTrack.spotifyTrack.artists.map((a) => a.name).join(", ")}
              </span>
            )}
          </div>
        </div>

        <div className={styles.percentageBadge}>
          <span className={styles.percentNumber}>{Math.round(progressPercent)}%</span>
        </div>
      </div>

      {/* High-def animated progress bar */}
      <div className={styles.progressTrack}>
        <div
          className={`${styles.progressFill} ${isPaused ? styles.fillPaused : styles.fillActive}`}
          style={{ width: `${progressPercent}%` }}
        >
          <div className={styles.shimmerEffect} />
          {isRunning && !isPaused && progressPercent < 100 && (
            <div className={styles.leadingSpark} />
          )}
        </div>
      </div>

      {/* Live Metrics Chips & Controls */}
      <div className={styles.footerRow}>
        <div className={styles.metricsGroup}>
          <div className={styles.metricChip}>
            <span className={styles.chipIcon}>🎵</span>
            <span>
              {completedCount} of {totalSelected} songs ready
            </span>
          </div>

          <div className={styles.metricChip}>
            <span className={styles.chipIcon}>⚡</span>
            <span>
              {format.toUpperCase()} • {quality}kbps
            </span>
          </div>

          <div className={styles.metricChip}>
            <span className={styles.chipIcon}>⏱️</span>
            <span>{formatTime(elapsedSeconds)} elapsed</span>
          </div>

          {failedCount > 0 && (
            <div className={`${styles.metricChip} ${styles.chipError}`}>
              <span className={styles.chipIcon}>⚠️</span>
              <span>{failedCount} failed</span>
            </div>
          )}
        </div>

        {/* Action buttons while downloading */}
        {isRunning && (
          <div className={styles.actionsGroup}>
            <button
              className={styles.actionBtnPause}
              onClick={onPauseToggle}
              title={isPaused ? "Resume Downloads" : "Pause Downloads"}
            >
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button
              className={styles.actionBtnCancel}
              onClick={onCancel}
              title="Cancel All Downloads"
            >
              ✕ Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
