import { Router, Request, Response } from "express";
import { streamAudioFromYouTube, AudioFormat, AudioQuality } from "../lib/audio-processor.js";

const router = Router();

/**
 * GET /api/download?id=VIDEO_ID&format=mp3&quality=320
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const videoId = (req.query.id as string) || "";
  const format = ((req.query.format as string) || "mp3") as AudioFormat;
  const quality = ((req.query.quality as string) || "320") as AudioQuality;

  if (!videoId) {
    res.status(400).json({ error: "Missing required query parameter: id" });
    return;
  }

  // Sanitize video ID
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    res.status(400).json({ error: "Invalid YouTube video ID" });
    return;
  }

  try {
    await streamAudioFromYouTube({
      youtubeId: videoId,
      format,
      quality,
      res,
    });
  } catch (error) {
    console.error("Download route error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to process audio stream" });
    }
  }
});

export default router;
