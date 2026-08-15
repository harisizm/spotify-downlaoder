import { Router, Request, Response } from "express";
import { searchYouTubeBestMatch } from "../lib/youtube-search.js";

const router = Router();

/**
 * POST /api/search
 * Body: { title: string, artist: string, album?: string, duration_ms?: number }
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, artist, album, duration_ms } = req.body;

    if (!title || !artist) {
      res.status(400).json({ error: "Missing required fields: title and artist" });
      return;
    }

    const match = await searchYouTubeBestMatch({
      title,
      artist,
      album,
      duration_ms: duration_ms ? Number(duration_ms) : undefined,
    });

    if (!match) {
      res.json({ found: false, message: "No match found" });
      return;
    }

    res.json({
      found: true,
      videoId: match.videoId,
      title: match.title,
      author: match.author,
      durationSeconds: match.durationSeconds,
      score: match.score,
    });
  } catch (error) {
    console.error("Search route error:", error);
    res.status(500).json({ error: "Internal search error" });
  }
});

export default router;
