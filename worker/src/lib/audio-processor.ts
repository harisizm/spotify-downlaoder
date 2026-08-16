import { spawn } from "child_process";
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
  if (fs.existsSync("/usr/local/bin/yt-dlp")) return "/usr/local/bin/yt-dlp";
  if (fs.existsSync("/usr/bin/yt-dlp")) return "/usr/bin/yt-dlp";

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
  if (fs.existsSync("/usr/bin/ffmpeg")) return "/usr/bin/ffmpeg";
  if (fs.existsSync("/usr/local/bin/ffmpeg")) return "/usr/local/bin/ffmpeg";

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

    // yt-dlp arguments: extract audio stream to stdout with multi-client android/web support
    const ytdlpArgs = [
      "--extractor-args", "youtube:player_client=android,web,mweb,ios",
      "-f", "251/ba/140/18/bestaudio/best",
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

    // FFmpeg arguments: transcode streaming audio to selected format
    const ffmpegArgs = ["-i", "pipe:0", "-vn"];

    switch (format) {
      case "m4a":
        ffmpegArgs.push("-c:a", "aac", "-b:a", `${quality}k`, "-ar", "44100", "-f", "adts");
        break;
      case "opus":
        ffmpegArgs.push("-c:a", "libopus", "-b:a", `${quality}k`, "-f", "opus");
        break;
      case "wav":
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
    } catch (ffmpegErr) {
      console.error("Failed to spawn FFmpeg:", ffmpegErr);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to initialize audio converter." });
      }
      if (ytdlp && !ytdlp.killed) ytdlp.kill("SIGTERM");
      return reject(ffmpegErr);
    }

    let headersSent = false;
    let totalBytesStreamed = 0;

    // Handle EPIPE and stream errors safely
    const ignorePipeError = (err: any) => {
      if (err && (err.code === "EPIPE" || err.code === "ECONNRESET" || err.code === "ERR_STREAM_DESTROYED")) {
        return;
      }
      if (err) console.warn("Audio stream pipe notice:", err.message || err);
    };

    ytdlp.stdout.on("error", ignorePipeError);
    ffmpeg.stdin.on("error", ignorePipeError);
    ffmpeg.stdout.on("error", ignorePipeError);
    res.on("error", ignorePipeError);

    ytdlp.stdout.pipe(ffmpeg.stdin);

    ffmpeg.stdout.on("data", (chunk: Buffer) => {
      if (!headersSent) {
        headersSent = true;
        res.writeHead(200, {
          "Content-Type": mimeTypes[format] || "audio/mpeg",
          "Accept-Ranges": "bytes",
          "Transfer-Encoding": "chunked",
        });
      }
      totalBytesStreamed += chunk.length;
      res.write(chunk);
    });

    ffmpeg.stdout.on("end", () => {
      if (headersSent) {
        res.end();
      }
    });

    const cleanup = () => {
      try {
        if (ytdlp && !ytdlp.killed) ytdlp.kill("SIGTERM");
      } catch {}
      try {
        if (ffmpeg && !ffmpeg.killed) ffmpeg.kill("SIGTERM");
      } catch {}
    };

    res.on("close", cleanup);
    res.on("finish", cleanup);

    ffmpeg.on("close", (code: number) => {
      cleanup();
      if (!headersSent && !res.headersSent) {
        console.error(`[AudioProcessor] FFmpeg exited with code ${code} without audio output.`);
        res.status(500).json({ error: `Audio extraction failed (code ${code})` });
        return reject(new Error(`FFmpeg exited with code ${code}`));
      }
      console.log(`[AudioProcessor] Completed stream (${totalBytesStreamed} bytes sent, code ${code})`);
      resolve();
    });

    ffmpeg.on("error", (err: Error) => {
      ignorePipeError(err);
      cleanup();
      if (!headersSent && !res.headersSent) {
        res.status(500).json({ error: "FFmpeg process error." });
      }
      reject(err);
    });

    ytdlp.on("error", (err: Error) => {
      ignorePipeError(err);
      cleanup();
      if (!headersSent && !res.headersSent) {
        res.status(500).json({ error: "yt-dlp process error." });
      }
      reject(err);
    });
  });
}
