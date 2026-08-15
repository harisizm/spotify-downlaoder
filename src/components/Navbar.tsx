"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isTokenValid, clearTokens, getSpotifyProfile, initiateSpotifyAuth, type SpotifyUserProfile } from "@/lib/spotify-auth";
import { getDownloadQueue } from "@/lib/download-queue";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<SpotifyUserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Active Download Protection Modal state
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingNav, setPendingNav] = useState<"back" | "forward" | null>(null);
  const [downloadStats, setDownloadStats] = useState({ completed: 0, total: 0 });

  useEffect(() => {
    if (isTokenValid()) {
      setIsLoggedIn(true);
      getSpotifyProfile()
        .then(setUser)
        .catch(() => {});
    }
  }, []);

  // Protect accidental tab close or page reload when downloads are running
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const state = getDownloadQueue().getState();
      if (state.isRunning) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleBack = () => {
    const state = getDownloadQueue().getState();
    if (state.isRunning) {
      setDownloadStats({
        completed: state.completedCount || 0,
        total: state.totalSelected || 0,
      });
      setPendingNav("back");
      setShowWarningModal(true);
    } else {
      router.back();
    }
  };

  const handleForward = () => {
    const state = getDownloadQueue().getState();
    if (state.isRunning) {
      setDownloadStats({
        completed: state.completedCount || 0,
        total: state.totalSelected || 0,
      });
      setPendingNav("forward");
      setShowWarningModal(true);
    } else {
      router.forward();
    }
  };

  const handleConfirmLeave = () => {
    setShowWarningModal(false);
    getDownloadQueue().cancel();
    if (pendingNav === "back") {
      router.back();
    } else if (pendingNav === "forward") {
      router.forward();
    }
    setPendingNav(null);
  };

  const handleStay = () => {
    setShowWarningModal(false);
    setPendingNav(null);
  };

  const handleLogout = () => {
    clearTokens();
    setIsLoggedIn(false);
    setUser(null);
    window.location.href = "/";
  };

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.inner}>
          <div className={styles.leftSection}>
            {/* Forward / Backward Navigation Buttons */}
            <div className={styles.navControls}>
              <button
                className={styles.navControlBtn}
                onClick={handleBack}
                title="Go back"
                aria-label="Go back"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                className={styles.navControlBtn}
                onClick={handleForward}
                title="Go forward"
                aria-label="Go forward"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <Link href="/" className={styles.logo}>
              <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 15L12 7L16 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.5 13H14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className={styles.logoText}>
                Spot<span className={styles.logoAccent}>Down</span>
              </span>
            </Link>
          </div>

          <div className={styles.nav}>
            {isLoggedIn ? (
              <div className={styles.userSection}>
                <Link href="/dashboard" className={styles.navLink}>
                  Dashboard
                </Link>
                <div className={styles.userMenu}>
                  <button
                    className={styles.userButton}
                    onClick={() => setMenuOpen(!menuOpen)}
                  >
                    {user?.images?.[0] ? (
                      <img
                        src={user.images[0].url}
                        alt={user.display_name}
                        className={styles.avatar}
                      />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {user?.display_name?.[0] || "?"}
                      </div>
                    )}
                    <span className={styles.userName}>
                      {user?.display_name || "User"}
                    </span>
                    <svg className={styles.chevron} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {menuOpen && (
                    <div className={styles.dropdown}>
                      <Link href="/dashboard" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="3" width="7" height="7" rx="1" />
                          <rect x="3" y="14" width="7" height="7" rx="1" />
                          <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                        Dashboard
                      </Link>
                      <button className={styles.dropdownItem} onClick={handleLogout}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                <button
                  className={styles.connectSpotifyBtn}
                  onClick={() => initiateSpotifyAuth()}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.5 17.3c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.9-9.3-1-.4.1-.7-.1-.8-.5-.1-.4.1-.7.5-.8 4-.9 7.5-.5 10.3 1.2.3.2.4.6.2.9zm1.5-3.3c-.3.4-.8.5-1.2.3-3-1.8-7.5-2.4-11-1.3-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 4-1.2 9-.6 12.4 1.5.4.2.5.7.3 1zm.1-3.4C15.5 8.4 9.4 8.2 5.5 9.4c-.6.2-1.2-.2-1.4-.7-.2-.6.2-1.2.7-1.4 4.5-1.4 11.2-1.1 15.3 1.3.5.3.7 1 .4 1.5-.3.5-1 .7-1.4.4z"/>
                  </svg>
                  Connect Spotify
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Active Download Warning Modal */}
      {showWarningModal && (
        <div className={styles.modalBackdrop} onClick={handleStay}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIconWrapper}>
              <div className={styles.modalIconGlow} />
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#eab308" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h3 className={styles.modalTitle}>Downloads In Progress</h3>

            <p className={styles.modalText}>
              You currently have songs downloading ({downloadStats.completed} of {downloadStats.total} completed). Navigating away from this page will cancel active background streams.
            </p>

            <div className={styles.modalActions}>
              <button className={styles.modalStayBtn} onClick={handleStay}>
                Stay on Page (Keep Downloading)
              </button>
              <button className={styles.modalLeaveBtn} onClick={handleConfirmLeave}>
                Leave Page &amp; Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
