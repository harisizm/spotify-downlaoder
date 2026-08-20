import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import searchRoute from "./routes/search.js";
import downloadRoute from "./routes/download.js";
import batchRoute from "./routes/batch.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in local dev
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parser
app.use(express.json({ limit: "5mb" }));

// Rate limiting (5000 requests per minute to smoothly support 100-500+ song playlists)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || "5000", 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for local development / loopback calls
    const ip = req.ip || req.socket.remoteAddress || "";
    return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1" || ip === "localhost";
  },
  validate: {
    xForwardedForHeader: false,
    trustProxy: false,
  },
  message: { error: "Too many requests from this IP, please try again later." },
});
app.use("/api/", limiter);

// Root welcome route
app.get("/", (_req, res) => {
  res.json({
    service: "Pasooriizm Worker Backend",
    status: "online",
    version: "1.0.0",
    endpoints: ["/health", "/api/search", "/api/download", "/api/batch", "/api/heartbeat"],
  });
});

// Health check route
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Heartbeat sync endpoint - registers browser tab connections
app.all("/api/heartbeat", (req, res) => {
  const tabId = req.body?.tabId || req.query?.tabId || "default";
  res.json({
    status: "ok",
    connected: true,
    tabId,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Explicit shutdown endpoint (used by launcher or explicit exit)
app.all("/api/shutdown", (_req, res) => {
  res.json({ status: "shutting_down" });
  setTimeout(() => {
    if (process.platform === "win32") {
      try {
        const killCmd = `taskkill /FI "WindowTitle eq Pasooriizm Frontend*" /F 2>nul & for /f "tokens=5" %a in ('netstat -aon ^| findstr :3000 2^>nul') do taskkill /f /pid %a 2>nul`;
        import("child_process").then(({ exec }) => {
          exec(killCmd, () => {
            process.exit(0);
          });
        });
        setTimeout(() => process.exit(0), 1000);
        return;
      } catch {}
    }
    process.exit(0);
  }, 100);
});

// API Routes
app.use("/api/search", searchRoute);
app.use("/api/download", downloadRoute);
app.use("/api/batch", batchRoute);

// Start server
const server = app.listen(PORT, () => {
  console.log(`Pasooriizm worker backend listening on port ${PORT}`);
});

// Process safety: prevent pipe/socket disconnect errors from crashing worker
process.on("uncaughtException", (err: any) => {
  if (err && (err.code === "EPIPE" || err.code === "ECONNRESET" || err.code === "ERR_STREAM_DESTROYED")) {
    return;
  }
  console.error("Worker uncaught exception:", err);
});

process.on("unhandledRejection", (reason: any) => {
  if (reason && (reason.code === "EPIPE" || reason.code === "ECONNRESET")) {
    return;
  }
  console.error("Worker unhandled rejection:", reason);
});
