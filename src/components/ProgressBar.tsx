"use client";

import styles from "./ProgressBar.module.css";

interface ProgressBarProps {
  /** 0 to 100 */
  value: number;
  /** Optional label like "45 of 120 songs" */
  label?: string;
  /** Show percentage text */
  showPercent?: boolean;
  /** Visual size */
  size?: "sm" | "md" | "lg";
  /** Animated striped effect while in progress */
  animated?: boolean;
  /** Color variant */
  variant?: "green" | "blue" | "orange";
}

export default function ProgressBar({
  value,
  label,
  showPercent = true,
  size = "md",
  animated = true,
  variant = "green",
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const isComplete = clampedValue >= 100;

  return (
    <div className={styles.wrapper}>
      {(label || showPercent) && (
        <div className={styles.header}>
          {label && <span className={styles.label}>{label}</span>}
          {showPercent && (
            <span className={`${styles.percent} ${isComplete ? styles.complete : ""}`}>
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}
      <div className={`${styles.track} ${styles[size]}`}>
        <div
          className={`${styles.fill} ${styles[variant]} ${
            animated && !isComplete ? styles.animated : ""
          } ${isComplete ? styles.fillComplete : ""}`}
          style={{ width: `${clampedValue}%` }}
        >
          {animated && !isComplete && <div className={styles.shimmer} />}
        </div>
      </div>
    </div>
  );
}
