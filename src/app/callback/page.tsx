"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCodeForTokens } from "@/lib/spotify-auth";
import { parseSpotifyUrl } from "@/lib/spotify-api";
import SpotifyConnectGameModal from "@/components/SpotifyConnectGameModal";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import styles from "./callback.module.css";
import { Suspense } from "react";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "coming_soon">("loading");
  const [showGameModal, setShowGameModal] = useState(true);

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      // Show user-friendly coming soon experience instead of raw error
      setStatus("coming_soon");
      setShowGameModal(true);
      return;
    }

    exchangeCodeForTokens(code)
      .then(() => {
        setStatus("success");
        const pendingUrl = localStorage.getItem("pending_spotify_url");
        if (pendingUrl) {
          localStorage.removeItem("pending_spotify_url");
          const parsed = parseSpotifyUrl(pendingUrl);
          if (parsed) {
            setTimeout(() => router.push(`/download/${parsed.id}?type=${parsed.type}`), 1000);
            return;
          }
        }
        setTimeout(() => router.push("/dashboard"), 1000);
      })
      .catch(() => {
        setStatus("coming_soon");
        setShowGameModal(true);
      });
  }, [searchParams, router]);

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.card}>
          {status === "loading" && (
            <>
              <div className={styles.spinner}>
                <div className={styles.spinnerRing} />
              </div>
              <h2 className={styles.title}>Connecting to Spotify...</h2>
              <p className={styles.text}>Checking credentials...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className={styles.successIcon}>
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className={styles.title}>Connected!</h2>
              <p className={styles.text}>Redirecting to your dashboard...</p>
            </>
          )}

          {status === "coming_soon" && (
            <>
              <div className={styles.successIcon} style={{ background: "rgba(29, 185, 84, 0.15)", color: "var(--spotify-green)" }}>
                <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.5 17.3c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.9-9.3-1-.4.1-.7-.1-.8-.5-.1-.4.1-.7.5-.8 4-.9 7.5-.5 10.3 1.2.3.2.4.6.2.9zm1.5-3.3c-.3.4-.8.5-1.2.3-3-1.8-7.5-2.4-11-1.3-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 4-1.2 9-.6 12.4 1.5.4.2.5.7.3 1zm.1-3.4C15.5 8.4 9.4 8.2 5.5 9.4c-.6.2-1.2-.2-1.4-.7-.2-.6.2-1.2.7-1.4 4.5-1.4 11.2-1.1 15.3 1.3.5.3.7 1 .4 1.5-.3.5-1 .7-1.4.4z"/>
                </svg>
              </div>
              <h2 className={styles.title}>Direct Spotify Sync Under Development</h2>
              <p className={styles.text}>
                Direct account sync is currently in the works! You can already download any playlist or song without logging in.
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "16px" }}>
                <button className={styles.retryBtn} onClick={() => router.push("/")}>
                  Back to Downloader
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <SpotifyConnectGameModal
        isOpen={showGameModal && status === "coming_soon"}
        onClose={() => setShowGameModal(false)}
      />

      <Footer />
    </>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.spinner}>
              <div className={styles.spinnerRing} />
            </div>
            <h2 className={styles.title}>Loading...</h2>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
