"use client";

import React, { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  getAnonymousEvents,
  fetchRemoteStats,
  computeStatsSummary,
  clearAllStats,
  type AnonymousDownloadEvent,
} from "@/lib/stats-store";
import styles from "./stats.module.css";

type SortField = "timestamp" | "title" | "tracksCount" | "sizeBytes" | "durationSeconds";
type SortDirection = "asc" | "desc";

export default function StatsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const [events, setEvents] = useState<AnonymousDownloadEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    // Check if session token exists
    const sessionToken = sessionStorage.getItem("pasooriizm_admin_auth");
    if (sessionToken) {
      setIsAuthenticated(true);
      setEvents(getAnonymousEvents());
      fetchRemoteStats().then(setEvents);
    }
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setIsVerifying(true);
    setAuthError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem("pasooriizm_admin_auth", data.token);
        setIsAuthenticated(true);
        setEvents(getAnonymousEvents());
        fetchRemoteStats().then(setEvents);
      } else {
        setAuthError("Incorrect admin password. Please try again.");
      }
    } catch {
      setAuthError("Authentication request failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem("pasooriizm_admin_auth");
    setIsAuthenticated(false);
    setPasswordInput("");
  };

  const handleResetAllStats = () => {
    if (window.confirm("Are you sure you want to reset all telemetry data to 0? This will clear all records for fresh live user tracking.")) {
      clearAllStats();
      setEvents([]);
    }
  };

  const summary = useMemo(() => computeStatsSummary(events), [events]);

  // Filtered & Sorted events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (e.title || "").toLowerCase().includes(q);
        const artistMatch = (e.artist || "").toLowerCase().includes(q);
        if (!titleMatch && !artistMatch) return false;
      }
      // Format
      if (formatFilter !== "all" && e.format !== formatFilter) return false;
      // Type
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      // Status
      if (statusFilter !== "all" && e.status !== statusFilter) return false;

      return true;
    });
  }, [events, searchQuery, formatFilter, typeFilter, statusFilter]);

  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "timestamp") {
        const timeA = new Date(aVal as string).getTime();
        const timeB = new Date(bVal as string).getTime();
        return sortDir === "asc" ? timeA - timeB : timeB - timeA;
      }

      if (typeof aVal === "string") {
        return sortDir === "asc"
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }

      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [filteredEvents, sortField, sortDir]);

  // Pagination
  const totalPages = Math.ceil(sortedEvents.length / pageSize) || 1;
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedEvents.slice(start, start + pageSize);
  }, [sortedEvents, currentPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Timestamp",
      "Type",
      "Title",
      "Artist",
      "Tracks",
      "Format",
      "Quality",
      "Size (MB)",
      "Duration (s)",
      "Status",
      "Platform",
    ];

    const rows = sortedEvents.map((e) => [
      e.timestamp,
      e.type,
      `"${(e.title || "").replace(/"/g, '""')}"`,
      `"${(e.artist || "").replace(/"/g, '""')}"`,
      e.tracksCount,
      e.format,
      `${e.quality}k`,
      (e.sizeBytes / 1024 / 1024).toFixed(2),
      e.durationSeconds,
      e.status,
      e.platform,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pasooriizm_stats_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatTimeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className={styles.pageContainer}>
      <Navbar />

      <main className={styles.main}>
        {!isAuthenticated ? (
          <div className={styles.authContainer}>
            <div className={styles.authCard}>
              <div className={styles.authIconWrapper}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>

              <div className={styles.badge}>
                <span className={styles.pulseDot} />
                Protected Admin Gateway
              </div>

              <form onSubmit={handleAdminLogin} className={styles.authForm} style={{ marginTop: "var(--space-lg)" }}>
                <div className={styles.authInputWrapper}>
                  <input
                    type="password"
                    placeholder="Enter admin password..."
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setAuthError("");
                    }}
                    autoFocus
                    className={styles.authInput}
                  />
                </div>

                {authError && <p className={styles.authError}>{authError}</p>}

                <button type="submit" disabled={isVerifying || !passwordInput.trim()} className={styles.authSubmitBtn}>
                  {isVerifying ? "Verifying..." : "Unlock Dashboard"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className={styles.headerSection}>
              <div>
                <div className={styles.badge}>
                  <span className={styles.pulseDot} />
                  Live Telemetry • Privacy First
                </div>
                <h1 className={styles.title}>System &amp; Download Stats</h1>
                <p className={styles.subtitle}>
                  Real-time anonymous telemetry tracking download volume, format distributions, and performance.
                </p>
              </div>

              <div className={styles.headerActions}>
                <button className={styles.actionBtn} onClick={handleExportCSV}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export CSV
                </button>
                <button
                  className={styles.actionBtn}
                  style={{ color: "#fbbf24", borderColor: "rgba(251, 191, 36, 0.3)" }}
                  onClick={handleResetAllStats}
                  title="Reset all stats to 0 for fresh production tracking"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  Reset Stats
                </button>
                <button className={styles.actionBtn} style={{ color: "#f87171" }} onClick={handleAdminLogout}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Lock
                </button>
              </div>
            </div>

            {/* KPI Cards Grid */}
        <div className={styles.kpiGrid}>
          <div className={`${styles.kpiCard} ${styles.kpiCardHighlight}`}>
            <span className={styles.kpiLabel}>Total Downloads</span>
            <span className={styles.kpiValue}>{summary.totalDownloads.toLocaleString()}</span>
            <span className={styles.kpiSub}>{summary.totalTracks.toLocaleString()} tracks processed</span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Audio Transcoded</span>
            <span className={styles.kpiValue}>{formatSize(summary.totalBytes)}</span>
            <span className={styles.kpiSub}>Total bandwidth delivered</span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Success Rate</span>
            <span className={styles.kpiValue}>{summary.successRate}%</span>
            <span className={styles.kpiSub}>Avg {summary.avgDurationSeconds}s conversion time</span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Top Format</span>
            <span className={styles.kpiValue}>
              {summary.formatBreakdown.mp3 >= summary.formatBreakdown.wav ? "MP3 320k" : "Lossless WAV"}
            </span>
            <span className={styles.kpiSub}>
              {Math.round(((summary.formatBreakdown.mp3 || 1) / (summary.totalDownloads || 1)) * 100)}% share
            </span>
          </div>
        </div>

        {/* Visual Distribution Charts */}
        <div className={styles.chartsRow}>
          {/* Format Breakdown */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <span>Audio Format Breakdown</span>
              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>By Requests</span>
            </div>
            <div className={styles.barRow}>
              {Object.entries(summary.formatBreakdown).map(([fmt, count]) => {
                const pct = summary.totalDownloads > 0 ? Math.round((count / summary.totalDownloads) * 100) : 0;
                return (
                  <div key={fmt} className={styles.barItem}>
                    <div className={styles.barMeta}>
                      <span>{fmt.toUpperCase()}</span>
                      <span>{count} ({pct}%)</span>
                    </div>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content Type Breakdown */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <span>Content Classification</span>
              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Type Distribution</span>
            </div>
            <div className={styles.barRow}>
              {Object.entries(summary.typeBreakdown).map(([type, count]) => {
                const pct = summary.totalDownloads > 0 ? Math.round((count / summary.totalDownloads) * 100) : 0;
                return (
                  <div key={type} className={styles.barItem}>
                    <div className={styles.barMeta}>
                      <span style={{ textTransform: "capitalize" }}>{type}s</span>
                      <span>{count} ({pct}%)</span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{
                          width: `${pct}%`,
                          background: type === "playlist" ? "var(--gradient-green)" : "linear-gradient(90deg, #3b82f6, #60a5fa)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Telemetry Data Table */}
        <div className={styles.tableCard}>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <svg className={styles.searchIcon} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search playlist, title, or artist..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filtersGroup}>
              {/* Format Filter */}
              <select
                value={formatFilter}
                onChange={(e) => {
                  setFormatFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={styles.filterSelect}
              >
                <option value="all">All Formats</option>
                <option value="mp3">MP3</option>
                <option value="wav">WAV</option>
                <option value="m4a">M4A</option>
                <option value="opus">OPUS</option>
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={styles.filterSelect}
              >
                <option value="all">All Types</option>
                <option value="playlist">Playlists</option>
                <option value="album">Albums</option>
                <option value="track">Single Tracks</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={styles.filterSelect}
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.statsTable}>
              <thead>
                <tr>
                  <th onClick={() => handleSort("timestamp")}>
                    Time
                    {sortField === "timestamp" && (
                      <span className={styles.sortIndicator}>{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </th>
                  <th onClick={() => handleSort("title")}>
                    Content / Name
                    {sortField === "title" && (
                      <span className={styles.sortIndicator}>{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </th>
                  <th>Format</th>
                  <th onClick={() => handleSort("tracksCount")}>
                    Tracks
                    {sortField === "tracksCount" && (
                      <span className={styles.sortIndicator}>{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </th>
                  <th onClick={() => handleSort("sizeBytes")}>
                    Size
                    {sortField === "sizeBytes" && (
                      <span className={styles.sortIndicator}>{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </th>
                  <th onClick={() => handleSort("durationSeconds")}>
                    Speed
                    {sortField === "durationSeconds" && (
                      <span className={styles.sortIndicator}>{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </th>
                  <th>Status</th>
                  <th>Device</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEvents.map((evt) => (
                  <tr key={evt.id}>
                    <td>{formatTimeAgo(evt.timestamp)}</td>
                    <td>
                      <div className={styles.titleCell} title={evt.title}>
                        {evt.title}
                      </div>
                      {evt.artist && <div className={styles.artistSub}>{evt.artist}</div>}
                    </td>
                    <td>
                      <span
                        className={`${styles.badgePill} ${
                          evt.format === "mp3"
                            ? styles.formatMp3
                            : evt.format === "wav"
                            ? styles.formatWav
                            : evt.format === "m4a"
                            ? styles.formatM4a
                            : styles.formatOpus
                        }`}
                      >
                        {evt.format.toUpperCase()} {evt.format !== "wav" ? `${evt.quality}k` : ""}
                      </span>
                    </td>
                    <td>{evt.tracksCount}</td>
                    <td>{formatSize(evt.sizeBytes)}</td>
                    <td>{evt.durationSeconds}s</td>
                    <td>
                      <span
                        className={`${styles.badgePill} ${
                          evt.status === "completed" ? styles.statusDone : styles.statusFailed
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-tertiary)" }}>{evt.platform}</td>
                  </tr>
                ))}

                {paginatedEvents.length === 0 && (
                  <tr>
                    <td colSpan={8} className={styles.emptyState}>
                      No download records match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className={styles.paginationRow}>
            <span>
              Showing {sortedEvents.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, sortedEvents.length)} of {sortedEvents.length} records
            </span>
            <div className={styles.pageControls}>
              <button
                className={styles.pageBtn}
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className={styles.pageBtn}
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </>
    )}
  </main>

      <Footer />
    </div>
  );
}
