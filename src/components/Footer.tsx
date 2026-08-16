import React from "react";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.infoRow}>
          <p className={styles.legalText}>
            Pasooriizm lets you download Spotify playlists, albums, and tracks directly to your device for offline listening.
            <br />
            Built for personal use. Not affiliated with Spotify AB.
          </p>
          <p className={styles.copyright}>
            © 2026 Pasooriizm by{" "}
            <a
              href="https://www.linkedin.com/in/harisizm/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.authorLink}
              title="harisizm on LinkedIn"
            >
              <svg className={styles.linkedinIcon} viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.46 1.46 0 1 0 0-2.92 1.46 1.46 0 0 0 0 2.92M7.85 18.5V10.13H5.06v8.37h2.79z" />
              </svg>
              <span>harisizm</span>
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
