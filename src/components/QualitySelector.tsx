"use client";

import type { AudioFormat, AudioQuality } from "@/lib/download-queue";
import styles from "./QualitySelector.module.css";

interface QualitySelectorProps {
  format: AudioFormat;
  quality: AudioQuality;
  onFormatChange: (format: AudioFormat) => void;
  onQualityChange: (quality: AudioQuality) => void;
  disabled?: boolean;
}

const FORMATS: { value: AudioFormat; label: string; desc: string }[] = [
  { value: "mp3", label: "MP3", desc: "Universal compatibility" },
  { value: "m4a", label: "M4A", desc: "Apple / AAC codec" },
  { value: "opus", label: "OPUS", desc: "Smallest file size" },
  { value: "wav", label: "WAV", desc: "Uncompressed lossless" },
];

const QUALITIES: { value: AudioQuality; label: string; desc: string }[] = [
  { value: "128", label: "128 kbps", desc: "Smaller files" },
  { value: "192", label: "192 kbps", desc: "Balanced" },
  { value: "256", label: "256 kbps", desc: "High quality" },
  { value: "320", label: "320 kbps", desc: "Maximum quality" },
];

export default function QualitySelector({
  format,
  quality,
  onFormatChange,
  onQualityChange,
  disabled = false,
}: QualitySelectorProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          Format
        </h3>
        <div className={styles.options}>
          {FORMATS.map((f) => (
            <button
              key={f.value}
              className={`${styles.option} ${format === f.value ? styles.active : ""}`}
              onClick={() => onFormatChange(f.value)}
              disabled={disabled}
            >
              <span className={styles.optionLabel}>{f.label}</span>
              <span className={styles.optionDesc}>{f.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          Quality
        </h3>
        <div className={styles.options}>
          {QUALITIES.map((q) => (
            <button
              key={q.value}
              className={`${styles.option} ${quality === q.value ? styles.active : ""}`}
              onClick={() => onQualityChange(q.value)}
              disabled={disabled || format === "wav"}
            >
              <span className={styles.optionLabel}>{q.label}</span>
              <span className={styles.optionDesc}>{q.desc}</span>
            </button>
          ))}
        </div>
        {format === "wav" && (
          <p className={styles.hint}>
            WAV is lossless, so the quality setting does not apply.
          </p>
        )}
      </div>
    </div>
  );
}
