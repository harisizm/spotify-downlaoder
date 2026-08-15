import { Router, Request, Response } from "express";
import { searchYouTubeBestMatch, SearchQuery } from "../lib/youtube-search.js";

const router = Router();

/**
 * POST /api/batch/search
 * Body: { tracks: SearchQuery[] }
 */
router.post("/search", async (req: Request, res: Response): Promise<void> => {
  try {
    const { tracks } = req.body;

    if (!Array.isArray(tracks)) {
      res.status(400).json({ error: "tracks must be an array" });
      return;
    }

    // Process searches with concurrency limit of 5
    const results = [];
    const concurrency = 5;

    for (let i = 0; i < tracks.length; i += concurrency) {
      const chunk = tracks.slice(i, i + concurrency);
      const chunkResults = await Promise.all(
        chunk.map(async (track: SearchQuery) => {
          const match = await searchYouTubeBestMatch(track);
          return {
            title: track.title,
            artist: track.artist,
            found: !!match,
            match,
          };
        })
      );
      results.push(...chunkResults);
    }

    res.json({ results });
  } catch (error) {
    console.error("Batch search error:", error);
    res.status(500).json({ error: "Internal batch search error" });
  }
});

export default router;
