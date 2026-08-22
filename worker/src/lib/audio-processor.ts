import { spawn } from "child_process";
import { Response } from "express";
import path from "path";
import fs from "fs";
import os from "os";

export type AudioFormat = "mp3" | "m4a" | "opus" | "wav";
export type AudioQuality = "128" | "192" | "256" | "320";

export interface StreamAudioOptions {
  youtubeId: string;
  format?: AudioFormat;
  quality?: AudioQuality;
  res: Response;
}

const PROCESS_TIMEOUT_MS = 60_000; // 60s timeout

/**
 * Determine the directory containing ffmpeg binaries across any working directory
 */
function getFfmpegLocation(): string | undefined {
  const candidates = [
    path.resolve(process.cwd(), "worker", "bin"),
    path.resolve(process.cwd(), "bin"),
    path.resolve(process.cwd(), "worker", "bin", "ffmpeg.exe"),
    path.resolve(process.cwd(), "bin", "ffmpeg.exe"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.statSync(candidate).isDirectory() ? candidate : path.dirname(candidate);
    }
  }

  return undefined;
}

/**
 * Determine the executable path for yt-dlp across any working directory
 */
function getYtDlpPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "worker", "bin", "yt-dlp.exe"),
    path.resolve(process.cwd(), "bin", "yt-dlp.exe"),
    path.resolve(process.cwd(), "worker", "bin", "yt-dlp"),
    path.resolve(process.cwd(), "bin", "yt-dlp"),
    "/usr/local/bin/yt-dlp",
    "/usr/bin/yt-dlp",
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
}

/**
 * High-performance audio streaming engine with automatic temp cleanup
 */
export function streamAudioFromYouTube({
  youtubeId,
  format = "mp3",
  quality = "320",
  res,
}: StreamAudioOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    const ytDlpPath = getYtDlpPath();
    const nodeRuntimeArg = `node:${process.execPath}`;

    const mimeTypes: Record<AudioFormat, string> = {
      mp3: "audio/mpeg",
      m4a: "audio/mp4",
      opus: "audio/opus",
      wav: "audio/wav",
    };

    const isDirectPassThrough = format === "m4a" || format === "opus";

    if (isDirectPassThrough) {
      // 1. Direct in-memory stream for M4A & OPUS (0 bytes to disk)
      // Uses android,ios,mweb client args to bypass YouTube 429 Bot Detection
      const formatSpec =
        format === "m4a"
          ? "140/251/18/ba[ext=m4a]/ba/b"
          : "251/140/18/ba[ext=webm]/ba/b";

      const ytdlpArgs = [
        "--js-runtimes", nodeRuntimeArg,
        "--extractor-args", "youtube:player_client=android,ios,mweb",
        "-f", formatSpec,
        "--concurrent-fragments", "5",
        "--buffer-size", "16M",
        "--socket-timeout", "15",
        "--retries", "3",
        "--fragment-retries", "3",
        "--no-playlist",
        "--no-warnings",
        "--geo-bypass",
        "-o", "-",
        youtubeUrl,
      ];

      console.log(`[AudioProcessor] Direct in-memory stream for ${youtubeId} (${format}) -> client`);
      const startMs = Date.now();

      let ytdlp: any;
      let isSettled = false;

      const killProcess = () => {
        try {
          if (ytdlp) ytdlp.kill("SIGKILL");
        } catch {}
      };

      const timeoutTimer = setTimeout(() => {
        if (isSettled) return;
        isSettled = true;
        killProcess();
        if (!res.headersSent) res.status(504).json({ error: "Audio extraction timed out." });
        reject(new Error("Stream timed out"));
      }, PROCESS_TIMEOUT_MS);

      try {
        ytdlp = spawn(ytDlpPath, ytdlpArgs);
      } catch (spawnErr) {
        return reject(spawnErr);
      }

      res.setHeader("Content-Type", mimeTypes[format] || "audio/mp4");
      res.setHeader("Transfer-Encoding", "chunked");
      res.setHeader("Accept-Ranges", "bytes");

      res.on("close", () => {
        killProcess();
      });

      ytdlp.stdout.pipe(res);

      ytdlp.on("close", (code: number) => {
        if (isSettled) return;
        clearTimeout(timeoutTimer);
        isSettled = true;
        const durationSec = ((Date.now() - startMs) / 1000).toFixed(1);
        if (code === 0) {
          console.log(`[AudioProcessor] Streamed ${youtubeId} (${format}) in ${durationSec}s`);
          resolve();
        } else {
          reject(new Error(`yt-dlp exited with code ${code}`));
        }
      });

      ytdlp.on("error", (err: Error) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timeoutTimer);
        killProcess();
        reject(err);
      });
    } else {
      // 2. High-speed multi-core transcode for MP3 & WAV with immediate disk cleanup
      const tempId = `spotdown_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const tempDir = os.tmpdir();
      const tempBasePath = path.join(tempDir, tempId);
      const ext = format === "mp3" ? "mp3" : "wav";
      const expectedOutput = `${tempBasePath}.${ext}`;

      const ffmpegLocation = getFfmpegLocation();
      const ytdlpArgs = [
        "--js-runtimes", nodeRuntimeArg,
        "--extractor-args", "youtube:player_client=android,ios,mweb",
        "-f", "251/140/18/ba/b",
        "--concurrent-fragments", "5",
        "--buffer-size", "16M",
        "--socket-timeout", "15",
        "--retries", "3",
        "--fragment-retries", "3",
        "--no-playlist",
        "--no-warnings",
        "--no-part",
        "--geo-bypass",
        "-x",
        "--audio-format", ext,
        "--audio-quality", format === "wav" ? "0" : `${quality}k`,
        "--postprocessor-args", "ExtractAudio:-threads 0",
        ...(ffmpegLocation ? ["--ffmpeg-location", ffmpegLocation] : []),
        "-o", `${tempBasePath}.%(ext)s`,
        youtubeUrl,
      ];

      console.log(`[AudioProcessor] Processing ${youtubeId} (${format} ${quality}k) via all CPU cores`);
      const startMs = Date.now();

      let ytdlp: any;
      let isSettled = false;

      const cleanupFiles = () => {
        try {
          const files = fs.readdirSync(tempDir);
          for (const file of files) {
            if (file.startsWith(tempId)) {
              fs.unlinkSync(path.join(tempDir, file));
            }
          }
        } catch {}
      };

      const killProcess = () => {
        try {
          if (ytdlp) ytdlp.kill("SIGKILL");
        } catch {}
        cleanupFiles();
      };

      const timeoutTimer = setTimeout(() => {
        if (isSettled) return;
        isSettled = true;
        killProcess();
        if (!res.headersSent) res.status(504).json({ error: "Audio extraction timed out." });
        reject(new Error("Audio extraction timed out"));
      }, PROCESS_TIMEOUT_MS);

      try {
        ytdlp = spawn(ytDlpPath, ytdlpArgs);
      } catch (spawnErr) {
        cleanupFiles();
        return reject(spawnErr);
      }

      res.on("close", () => {
        killProcess();
      });

      ytdlp.on("close", (code: number) => {
        if (isSettled) return;
        clearTimeout(timeoutTimer);

        if (code !== 0) {
          isSettled = true;
          cleanupFiles();
          return reject(new Error(`yt-dlp exited with code ${code}`));
        }

        // Locate generated audio file
        let finalFile = expectedOutput;
        if (!fs.existsSync(finalFile)) {
          const found = fs.readdirSync(tempDir).find((f) => f.startsWith(tempId) && f.endsWith(`.${ext}`));
          if (found) finalFile = path.join(tempDir, found);
        }

        if (!fs.existsSync(finalFile)) {
          isSettled = true;
          cleanupFiles();
          return reject(new Error(`Output audio file not found: ${expectedOutput}`));
        }

        const stat = fs.statSync(finalFile);
        res.setHeader("Content-Type", mimeTypes[format] || "audio/mpeg");
        res.setHeader("Content-Length", stat.size.toString());
        res.setHeader("Accept-Ranges", "bytes");

        const readStream = fs.createReadStream(finalFile);
        readStream.pipe(res);

        readStream.on("end", () => {
          isSettled = true;
          const durationSec = ((Date.now() - startMs) / 1000).toFixed(1);
          console.log(`[AudioProcessor] Streamed ${youtubeId} (${format} ${quality}k) in ${durationSec}s`);
          cleanupFiles();
          resolve();
        });

        readStream.on("error", (streamErr) => {
          isSettled = true;
          cleanupFiles();
          reject(streamErr);
        });
      });

      ytdlp.on("error", (err: Error) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timeoutTimer);
        killProcess();
        reject(err);
      });
    }
  });
}
