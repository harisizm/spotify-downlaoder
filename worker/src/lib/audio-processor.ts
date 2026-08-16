import { spawn } from "child_process";
import { Response } from "express";
import path from "path";
import fs from "fs";
import os from "os";
import ffmpegPath from "ffmpeg-static";

export type AudioFormat = "mp3" | "m4a" | "opus" | "wav";
export type AudioQuality = "128" | "192" | "256" | "320";

export interface StreamAudioOptions {
  youtubeId: string;
  format?: AudioFormat;
  quality?: AudioQuality;
  res: Response;
}

/**
 * Determine the executable path for yt-dlp
 */
function getYtDlpPath(): string {
  if (fs.existsSync("/usr/local/bin/yt-dlp")) return "/usr/local/bin/yt-dlp";
  if (fs.existsSync("/usr/bin/yt-dlp")) return "/usr/bin/yt-dlp";

  const localBinExe = path.resolve(process.cwd(), "bin", "yt-dlp.exe");
  if (fs.existsSync(localBinExe)) return localBinExe;

  const localBinLinux = path.resolve(process.cwd(), "bin", "yt-dlp");
  if (fs.existsSync(localBinLinux)) return localBinLinux;

  return process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
}

/**
 * Determine the directory path for FFmpeg executable
 */
function getFfmpegDir(): string {
  if (fs.existsSync("/usr/bin/ffmpeg")) return "/usr/bin";
  if (fs.existsSync("/usr/local/bin/ffmpeg")) return "/usr/local/bin";

  if (ffmpegPath && fs.existsSync(ffmpegPath)) {
    return path.dirname(ffmpegPath);
  }
  return "";
}

/**
 * Download and convert audio from YouTube, streaming the verified file to the client
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
    const ffmpegDir = getFfmpegDir();

    const mimeTypes: Record<AudioFormat, string> = {
      mp3: "audio/mpeg",
      m4a: "audio/mp4",
      opus: "audio/opus",
      wav: "audio/wav",
    };

    const ext = format === "opus" ? "opus" : format === "m4a" ? "m4a" : format === "wav" ? "wav" : "mp3";
    const tempFileId = `spotdown_${youtubeId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const tempBasePath = path.join(os.tmpdir(), tempFileId);
    const finalFilePath = `${tempBasePath}.${ext}`;

    const ytdlpArgs = [
      "--extractor-args", "youtube:player_client=android,web,mweb,ios",
      "-f", "251/ba/140/18/bestaudio/best",
      "--no-playlist",
      "--no-warnings",
      "-x",
      "--audio-format", ext,
      "--audio-quality", format === "wav" ? "0" : `${quality}k`,
      "-o", `${tempBasePath}.%(ext)s`,
    ];

    if (ffmpegDir) {
      ytdlpArgs.push("--ffmpeg-location", ffmpegDir);
    }

    ytdlpArgs.push(youtubeUrl);

    console.log(`[AudioProcessor] Starting audio fetch for ${youtubeId} (${format} ${quality}k) -> ${finalFilePath}`);
    const startMs = Date.now();

    let ytdlp: any;
    try {
      ytdlp = spawn(ytDlpPath, ytdlpArgs);
    } catch (spawnErr) {
      console.error("[AudioProcessor] Failed to spawn yt-dlp:", spawnErr);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to initialize audio extraction engine." });
      }
      return reject(spawnErr);
    }

    let stderrOutput = "";
    ytdlp.stderr.on("data", (d: Buffer) => {
      stderrOutput += d.toString();
    });

    const cleanupTemp = () => {
      try {
        if (fs.existsSync(finalFilePath)) {
          fs.unlinkSync(finalFilePath);
        }
      } catch {}
    };

    ytdlp.on("close", (code: number) => {
      const durationSec = ((Date.now() - startMs) / 1000).toFixed(1);

      if (code !== 0 || !fs.existsSync(finalFilePath)) {
        console.error(`[AudioProcessor] yt-dlp failed (code ${code}) in ${durationSec}s. Stderr:`, stderrOutput);
        cleanupTemp();
        if (!res.headersSent) {
          res.status(500).json({ error: `Audio extraction failed (code ${code})` });
        }
        return reject(new Error(`yt-dlp exited with code ${code}`));
      }

      const stat = fs.statSync(finalFilePath);
      console.log(`[AudioProcessor] Successfully converted ${youtubeId} in ${durationSec}s (${(stat.size / 1024 / 1024).toFixed(2)} MB). Streaming to client...`);

      res.setHeader("Content-Type", mimeTypes[format] || "audio/mpeg");
      res.setHeader("Content-Length", stat.size.toString());
      res.setHeader("Accept-Ranges", "bytes");

      const readStream = fs.createReadStream(finalFilePath);
      readStream.on("error", (streamErr) => {
        console.warn("[AudioProcessor] ReadStream notice:", streamErr.message);
        cleanupTemp();
      });

      res.on("close", () => {
        readStream.destroy();
        cleanupTemp();
      });

      res.on("finish", () => {
        cleanupTemp();
        resolve();
      });

      readStream.pipe(res);
    });

    ytdlp.on("error", (err: Error) => {
      console.error("[AudioProcessor] yt-dlp process error:", err);
      cleanupTemp();
      if (!res.headersSent) {
        res.status(500).json({ error: "Download process encountered an error." });
      }
      reject(err);
    });
  });
}
