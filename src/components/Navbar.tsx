import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDownloadQueue } from "@/lib/download-queue";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const router = useRouter();

  // Active Download Protection Modal state
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingNav, setPendingNav] = useState<"back" | "forward" | null>(null);
  const [downloadStats, setDownloadStats] = useState({ completed: 0, total: 0 });

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
    const queue = getDownloadQueue();
    const state = queue.getState();
    const isActivelyStreaming = state.isRunning && !state.isPaused && state.completedCount < (state.totalSelected || 0);

    if (isActivelyStreaming) {
      setDownloadStats({
        completed: state.completedCount || 0,
        total: state.totalSelected || 0,
      });
      setPendingNav("back");
      setShowWarningModal(true);
    } else {
      if (typeof window !== "undefined" && window.history.length > 1) {
        window.history.back();
      } else {
        router.push("/");
      }
    }
  };

  const handleForward = () => {
    const queue = getDownloadQueue();
    const state = queue.getState();
    const isActivelyStreaming = state.isRunning && !state.isPaused && state.completedCount < (state.totalSelected || 0);

    if (isActivelyStreaming) {
      setDownloadStats({
        completed: state.completedCount || 0,
        total: state.totalSelected || 0,
      });
      setPendingNav("forward");
      setShowWarningModal(true);
    } else {
      if (typeof window !== "undefined") {
        window.history.forward();
      }
    }
  };

  const handleConfirmLeave = () => {
    setShowWarningModal(false);
    getDownloadQueue().cancel();
    if (pendingNav === "back") {
      if (typeof window !== "undefined" && window.history.length > 1) {
        window.history.back();
      } else {
        router.push("/");
      }
    } else if (pendingNav === "forward") {
      if (typeof window !== "undefined") {
        window.history.forward();
      }
    }
    setPendingNav(null);
  };

  const handleStay = () => {
    setShowWarningModal(false);
    setPendingNav(null);
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
                Pasoori<span className={styles.logoAccent}>izm</span>
              </span>
            </Link>
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
