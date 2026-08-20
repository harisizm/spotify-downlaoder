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
  estimatedSecondsRemaining?: number;
  tracksPerMinute?: number;
  onPauseToggle: () => void;
  onCancel: () => void;
  onSaveFetched?: () => void;
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
  estimatedSecondsRemaining = 0,
  tracksPerMinute = 0,
  onPauseToggle,
  onCancel,
  onSaveFetched,
}: LiveDownloadProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [displayEtaSeconds, setDisplayEtaSeconds] = useState(estimatedSecondsRemaining);
  const [statusMessageIndex, setStatusMessageIndex] = useState(0);
  const [justFinished, setJustFinished] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Sync ETA when queue emits updated estimation
  useEffect(() => {
    if (estimatedSecondsRemaining > 0) {
      setDisplayEtaSeconds(estimatedSecondsRemaining);
    }
  }, [estimatedSecondsRemaining]);

  // Smooth seconds countdown ticker for ETA (decrements naturally by 1s without jumping)
  useEffect(() => {
    let etaInterval: NodeJS.Timeout;
    if (isRunning && !isPaused) {
      etaInterval = setInterval(() => {
        setDisplayEtaSeconds((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(etaInterval);
  }, [isRunning, isPaused]);

  // Calculate live progress percentage (strictly monotonic and smooth)
  const progressPercent = useMemo(() => {
    if (totalSelected === 0) return 0;
    // Base is completedCount, plus bounded fraction for tracks actively in flight
    const inProgressCount = tracks.filter((t) =>
      t.selected && ["downloading", "converting"].includes(t.status)
    ).length;
    const partialSum = inProgressCount * 0.35; // gentle fractional offset for in-flight slots
    const totalDone = completedCount + Math.min(inProgressCount * 0.5, partialSum);
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

  // Format remaining ETA (e.g. ~3m 45s remaining)
  const formatEta = (secs: number) => {
    if (secs <= 0) return "< 5s remaining";
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    if (mins === 0) return `~${remSecs}s remaining`;
    return `~${mins}m ${remSecs < 10 ? "0" : ""}${remSecs}s remaining`;
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

          {isRunning && !isPaused && (
            <div className={`${styles.metricChip} ${styles.chipEta}`}>
              <span className={styles.chipIcon}>⏳</span>
              {completedCount < 2 || displayEtaSeconds <= 0 ? (
                <span>Calculating ETA...</span>
              ) : (
                <>
                  <span>{formatEta(displayEtaSeconds)}</span>
                  {tracksPerMinute > 0 && (
                    <span className={styles.speedSub}>({tracksPerMinute} songs/min)</span>
                  )}
                </>
              )}
            </div>
          )}

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
            {completedCount > 0 && onSaveFetched && (
              <button
                className={styles.actionBtnSaveReady}
                onClick={onSaveFetched}
                title={`Save ${completedCount} ready songs now`}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Save Fetched ({completedCount} Ready)
              </button>
            )}
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
