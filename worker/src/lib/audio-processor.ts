import { spawn, execSync } from "child_process";
import { Response } from "express";
import path from "path";
import fs from "fs";
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
  // Check local bin directory
  const localBinExe = path.resolve(process.cwd(), "bin", "yt-dlp.exe");
  if (fs.existsSync(localBinExe)) return localBinExe;

  const localBinLinux = path.resolve(process.cwd(), "bin", "yt-dlp");
  if (fs.existsSync(localBinLinux)) return localBinLinux;

  // Fallback to system PATH
  return process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
}

/**
 * Determine the executable path for FFmpeg
 */
function getFfmpegPath(): string {
  if (ffmpegPath && fs.existsSync(ffmpegPath)) {
    return ffmpegPath;
  }
  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}

/**
 * Stream audio from YouTube using yt-dlp and FFmpeg (pure audio, zero video)
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
    const ffmpegExe = getFfmpegPath();

    const mimeTypes: Record<AudioFormat, string> = {
      mp3: "audio/mpeg",
      m4a: "audio/mp4",
      opus: "audio/opus",
      wav: "audio/wav",
    };

    // Configure response headers
    res.setHeader("Content-Type", mimeTypes[format] || "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");

    // yt-dlp arguments: strictly extract best audio stream with node JS runtime
    const ytdlpArgs = [
      "--js-runtimes", "node",
      "-f", "ba/bestaudio/251/140",
      "--no-playlist",
      "--no-warnings",
      "-o", "-",
      youtubeUrl,
    ];

    let ytdlp: any;
    try {
      ytdlp = spawn(ytDlpPath, ytdlpArgs);
    } catch (spawnErr) {
      console.error("Failed to spawn yt-dlp:", spawnErr);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to initialize audio extraction." });
      }
      return reject(spawnErr);
    }

    // FFmpeg arguments: strictly strip video (-vn) and transcode to pure audio
    const ffmpegArgs = ["-i", "pipe:0", "-vn"];

    switch (format) {
      case "m4a":
        ffmpegArgs.push("-c:a", "aac", "-b:a", `${quality}k`, "-ar", "44100", "-f", "adts");
        break;
      case "opus":
        ffmpegArgs.push("-c:a", "libopus", "-b:a", `${quality}k`, "-f", "opus");
        break;
      case "wav":
        // Pure uncompressed 16-bit 44.1kHz stereo PCM lossless audio
        ffmpegArgs.push("-c:a", "pcm_s16le", "-ar", "44100", "-ac", "2", "-f", "wav");
        break;
      case "mp3":
      default:
        ffmpegArgs.push("-c:a", "libmp3lame", "-b:a", `${quality}k`, "-ar", "44100", "-f", "mp3");
        break;
    }

    ffmpegArgs.push("pipe:1");

    let ffmpeg: any;
    try {
      ffmpeg = spawn(ffmpegExe, ffmpegArgs);
    } catch (ffmpegSpawnErr) {
      console.error("Failed to spawn FFmpeg:", ffmpegSpawnErr);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to initialize audio converter." });
      }
      if (!ytdlp.killed) ytdlp.kill("SIGTERM");
      return reject(ffmpegSpawnErr);
    }

    ytdlp.stdout.pipe(ffmpeg.stdin);
    ffmpeg.stdout.pipe(res);

    res.on("close", () => {
      if (!ytdlp.killed) ytdlp.kill("SIGTERM");
      if (!ffmpeg.killed) ffmpeg.kill("SIGTERM");
    });

    ffmpeg.on("close", (code: number) => {
      resolve();
    });

    ffmpeg.on("error", (err: Error) => {
      console.error("FFmpeg error:", err);
    });

    ytdlp.stderr.on("data", (_data: Buffer) => {
      // Ignore normal progress logs from yt-dlp
    });

    ytdlp.on("error", (err: Error) => {
      console.error("yt-dlp error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Download process encountered an error." });
      }
      reject(err);
    });
  });
}
