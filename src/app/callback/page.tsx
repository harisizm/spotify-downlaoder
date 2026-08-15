"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCodeForTokens } from "@/lib/spotify-auth";
import { parseSpotifyUrl } from "@/lib/spotify-api";
import styles from "./callback.module.css";
import { Suspense } from "react";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setErrorMsg(error === "access_denied" ? "Access was denied. Please try again." : error);
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMsg("No authorization code received.");
      return;
    }

    exchangeCodeForTokens(code)
      .then(() => {
        setStatus("success");
        // Check if there's a pending URL
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
      .catch((err) => {
        setStatus("error");
        setErrorMsg(err.message || "Failed to exchange tokens.");
      });
  }, [searchParams, router]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {status === "loading" && (
          <>
            <div className={styles.spinner}>
              <div className={styles.spinnerRing} />
            </div>
            <h2 className={styles.title}>Connecting to Spotify</h2>
            <p className={styles.text}>Exchanging authorization code...</p>
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
            <p className={styles.text}>Redirecting you now...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className={styles.errorIcon}>
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h2 className={styles.title}>Something went wrong</h2>
            <p className={styles.text}>{errorMsg}</p>
            <button className={styles.retryBtn} onClick={() => router.push("/")}>
              Go back home
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.spinner}>
            <div className={styles.spinnerRing} />
          </div>
          <h2 className={styles.title}>Loading...</h2>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
