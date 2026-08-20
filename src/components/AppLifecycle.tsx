"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const WORKER_API_URL =
  process.env.NEXT_PUBLIC_WORKER_API_URL || "http://localhost:3001";

export default function AppLifecycle() {
  const pathname = usePathname();
  const tabIdRef = useRef<string>("");

  useEffect(() => {
    // Generate or retrieve persistent session tab ID
    if (typeof window !== "undefined") {
      let id = sessionStorage.getItem("spotdown_tab_id");
      if (!id) {
        id = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        sessionStorage.setItem("spotdown_tab_id", id);
      }
      tabIdRef.current = id;
    }

    // Sync with worker backend
    const syncWithWorker = () => {
      fetch(`${WORKER_API_URL}/api/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tabId: tabIdRef.current,
          path: pathname,
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    };

    // Immediate sync on load / route change
    syncWithWorker();
    const interval = setInterval(syncWithWorker, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [pathname]);

  return null;
}
