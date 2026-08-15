"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { isTokenValid, clearTokens, getSpotifyProfile, type SpotifyUserProfile } from "@/lib/spotify-auth";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [user, setUser] = useState<SpotifyUserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (isTokenValid()) {
      setIsLoggedIn(true);
      getSpotifyProfile()
        .then(setUser)
        .catch(() => {});
    }
  }, []);

  const handleLogout = () => {
    clearTokens();
    setIsLoggedIn(false);
    setUser(null);
    window.location.href = "/";
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
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
            <Link href="/" className={styles.navLink}>
              Home
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
