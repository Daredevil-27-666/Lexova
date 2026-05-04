// @ts-nocheck — Deno runtime; npm: specifiers and Deno globals are not understood by the local TS server
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { Redis } from "npm:@upstash/redis";
import { Ratelimit } from "npm:@upstash/ratelimit";
import { GoogleGenAI } from "npm:@google/genai";

const app = new Hono();

// ─── Rate limiting (Upstash Redis — dual-level) ──────────────────────────────
//
// Level A  Fixed Window  — daily hard cap aligned to YouTube API v3 quota:
//   search-tier endpoints cost 100 quota units each → cap at 50/day per IP
//   standard-tier endpoints cost 1 quota unit each  → cap at 500/day per IP
//
// Level B  Token Bucket  — per-second burst protection:
//   search-tier:  refill 2 tokens/s, bucket of 5
//   standard-tier: refill 5 tokens/s, bucket of 10

// Lazily initialize Redis — if Upstash env vars are not set the function still
// starts up and serves all routes; rate limiting is simply skipped.
let redis: Redis | null = null;
let searchDailyLimiter: Ratelimit | null = null;
let standardDailyLimiter: Ratelimit | null = null;
let searchBurstLimiter: Ratelimit | null = null;
let standardBurstLimiter: Ratelimit | null = null;

try {
  redis = Redis.fromEnv();

  // Level A — daily hard cap
  searchDailyLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(50, "1 d"),
    prefix: "rl:search:daily",
  });
  standardDailyLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(500, "1 d"),
    prefix: "rl:standard:daily",
  });

  // Level B — per-second token bucket
  searchBurstLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.tokenBucket(2, "1 s", 5),
    prefix: "rl:search:burst",
  });
  standardBurstLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.tokenBucket(5, "1 s", 10),
    prefix: "rl:standard:burst",
  });
} catch {
  console.log("Upstash Redis not configured — rate limiting disabled");
}

// Paths that fan out into multiple upstream YouTube search/quota calls
const SEARCH_TIER_PATHS = new Set([
  "/make-server-cc7585ff/youtube/search",
  "/make-server-cc7585ff/youtube/find-track",
  "/make-server-cc7585ff/youtube/related",
  "/make-server-cc7585ff/youtube/channel-videos",
]);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    maxAge: 600,
  }),
);

// Rate limit middleware — runs after CORS so preflight OPTIONS requests pass through
app.use("/*", async (c, next) => {
  if (c.req.method === "OPTIONS") return next();
  if (!searchDailyLimiter || !standardDailyLimiter || !searchBurstLimiter || !standardBurstLimiter) {
    return next(); // Redis not configured — skip rate limiting
  }

  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0].trim() ??
    c.req.header("cf-connecting-ip") ??
    "anonymous";

  const isSearchTier = SEARCH_TIER_PATHS.has(c.req.path);
  const dailyLimiter = isSearchTier ? searchDailyLimiter : standardDailyLimiter;
  const burstLimiter = isSearchTier ? searchBurstLimiter : standardBurstLimiter;

  // Check both levels in parallel; both must pass.
  // Wrap in try/catch so a Redis connection failure never blocks a request.
  let daily: Awaited<ReturnType<Ratelimit["limit"]>>;
  let burst: Awaited<ReturnType<Ratelimit["limit"]>>;
  try {
    [daily, burst] = await Promise.all([
      dailyLimiter.limit(ip),
      burstLimiter.limit(ip),
    ]);
  } catch (err) {
    console.log(`Rate limit check failed: ${err} — passing request through`);
    return next();
  }

  // Expose the daily cap headers (the more meaningful constraint for clients)
  c.header("X-RateLimit-Limit", String(daily.limit));
  c.header("X-RateLimit-Remaining", String(daily.remaining));
  c.header("X-RateLimit-Reset", String(daily.reset));

  if (!daily.success) {
    const retryAfter = Math.ceil((daily.reset - Date.now()) / 1000);
    c.header("Retry-After", String(retryAfter));
    return c.json({ error: "Daily request limit reached. Try again tomorrow." }, 429);
  }

  if (!burst.success) {
    const retryAfter = Math.ceil((burst.reset - Date.now()) / 1000);
    c.header("Retry-After", String(retryAfter));
    return c.json({ error: "Too many requests per second. Please slow down." }, 429);
  }

  return next();
});

// Health check endpoint
app.get("/make-server-cc7585ff/health", (c) => {
  return c.json({ status: "ok" });
});

// YouTube Search endpoint
app.get("/make-server-cc7585ff/youtube/search", async (c) => {
  const query = c.req.query("q");
  const pageToken = c.req.query("pageToken") || "";
  const maxResults = c.req.query("maxResults") || "20";

  if (!query || !query.trim()) {
    return c.json({ error: "Missing query parameter 'q'" }, 400);
  }

  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) {
    return c.json({ error: "YouTube API key not configured" }, 500);
  }

  const videoDuration = c.req.query("videoDuration") || "";

  try {
    const params = new URLSearchParams({
      part: "snippet",
      q: `${query} music`,
      type: "video",
      videoCategoryId: "10",
      maxResults,
      key: apiKey,
      ...(pageToken ? { pageToken } : {}),
      ...(videoDuration ? { videoDuration } : {}),
    });

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
    );
    const data = await response.json();

    if (!response.ok) {
      console.log(`YouTube API error: ${JSON.stringify(data)}`);
      return c.json({ error: data?.error?.message || "YouTube API error" }, response.status);
    }

    const videos = (data.items || []).map((item: any) => ({
      id: item.id?.videoId,
      title: item.snippet?.title,
      channel: item.snippet?.channelTitle,
      channelId: item.snippet?.channelId,
      thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
      publishedAt: item.snippet?.publishedAt,
      description: item.snippet?.description,
    }));

    return c.json({
      videos,
      nextPageToken: data.nextPageToken || null,
      totalResults: data.pageInfo?.totalResults || 0,
    });
  } catch (err) {
    console.log(`Error calling YouTube API: ${err}`);
    return c.json({ error: `Failed to fetch from YouTube: ${err}` }, 500);
  }
});

// YouTube Video Details endpoint
app.get("/make-server-cc7585ff/youtube/video", async (c) => {
  const videoId = c.req.query("id");

  if (!videoId) {
    return c.json({ error: "Missing 'id' parameter" }, 400);
  }

  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) {
    return c.json({ error: "YouTube API key not configured" }, 500);
  }

  try {
    const params = new URLSearchParams({
      part: "snippet,statistics,contentDetails",
      id: videoId,
      key: apiKey,
    });

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`
    );
    const data = await response.json();

    if (!response.ok) {
      console.log(`YouTube video API error: ${JSON.stringify(data)}`);
      return c.json({ error: data?.error?.message || "YouTube API error" }, response.status);
    }

    const item = data.items?.[0];
    if (!item) {
      return c.json({ error: "Video not found" }, 404);
    }

    return c.json({
      id: item.id,
      title: item.snippet?.title,
      channel: item.snippet?.channelTitle,
      channelId: item.snippet?.channelId,
      thumbnail: item.snippet?.thumbnails?.maxres?.url || item.snippet?.thumbnails?.high?.url,
      publishedAt: item.snippet?.publishedAt,
      description: item.snippet?.description,
      viewCount: item.statistics?.viewCount,
      likeCount: item.statistics?.likeCount,
      duration: item.contentDetails?.duration,
    });
  } catch (err) {
    console.log(`Error calling YouTube video API: ${err}`);
    return c.json({ error: `Failed to fetch video details: ${err}` }, 500);
  }
});

// YouTube Related Videos endpoint
app.get("/make-server-cc7585ff/youtube/related", async (c) => {
  const videoId = c.req.query("id");

  if (!videoId) {
    return c.json({ error: "Missing 'id' parameter" }, 400);
  }

  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) {
    return c.json({ error: "YouTube API key not configured" }, 500);
  }

  try {
    // Step 1 — Try relatedToVideoId (may be restricted for some API keys)
    const searchParams = new URLSearchParams({
      part: "id",
      relatedToVideoId: videoId,
      type: "video",
      maxResults: "10",
      key: apiKey,
    });

    let videoIds: string[] = [];

    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`
    );
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      videoIds = (searchData.items ?? [])
        .map((item: any) => item.id?.videoId)
        .filter(Boolean);
    }

    // Step 1b — Fallback: search by video title if relatedToVideoId returned nothing
    if (!videoIds.length) {
      const titleParams = new URLSearchParams({
        part: "snippet",
        id: videoId,
        key: apiKey,
      });
      const titleRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?${titleParams.toString()}`
      );
      if (titleRes.ok) {
        const titleData = await titleRes.json();
        const title: string = titleData.items?.[0]?.snippet?.title ?? "";
        const artist = title.split(/[-–|]/)[0].trim();

        if (artist) {
          const fallbackParams = new URLSearchParams({
            part: "id",
            q: `${artist} music`,
            type: "video",
            videoCategoryId: "10",
            maxResults: "10",
            key: apiKey,
          });
          const fallbackRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?${fallbackParams.toString()}`
          );
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            videoIds = (fallbackData.items ?? [])
              .map((item: any) => item.id?.videoId)
              .filter(Boolean)
              .filter((id: string) => id !== videoId);
          }
        }
      }
    }

    if (!videoIds.length) {
      return c.json({ videos: [] });
    }

    // Step 2 — Fetch full details in one request
    const detailsParams = new URLSearchParams({
      part: "snippet,contentDetails,statistics",
      id: videoIds.join(","),
      key: apiKey,
    });
    const detailsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${detailsParams.toString()}`
    );
    if (!detailsRes.ok) {
      const err = await detailsRes.json();
      return c.json({ error: err?.error?.message || "YouTube API error" }, detailsRes.status);
    }

    const detailsData = await detailsRes.json();
    const videos = (detailsData.items ?? []).map((item: any) => ({
      id: item.id,
      title: item.snippet?.title,
      channelName: item.snippet?.channelTitle,
      thumbnailUrl:
        item.snippet?.thumbnails?.maxres?.url ??
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.medium?.url ??
        "",
      viewCount: parseInt(item.statistics?.viewCount ?? "0", 10),
      durationSeconds: (() => {
        const iso: string = item.contentDetails?.duration ?? "";
        const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        return (
          parseInt(match[1] ?? "0", 10) * 3600 +
          parseInt(match[2] ?? "0", 10) * 60 +
          parseInt(match[3] ?? "0", 10)
        );
      })(),
    }));

    return c.json({ videos });
  } catch (err) {
    console.log(`Error fetching related videos: ${err}`);
    return c.json({ error: `Failed to fetch related videos: ${err}` }, 500);
  }
});

// YouTube Trending Music Chart endpoint
app.get("/make-server-cc7585ff/youtube/trending", async (c) => {
  const regionCode = c.req.query("regionCode") || "US";
  const maxResults = c.req.query("maxResults") || "8";

  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) {
    return c.json({ error: "YouTube API key not configured" }, 500);
  }

  try {
    const params = new URLSearchParams({
      part: "snippet,statistics,contentDetails",
      chart: "mostPopular",
      videoCategoryId: "10",
      regionCode,
      maxResults,
      key: apiKey,
    });

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`
    );
    const data = await response.json();

    if (!response.ok) {
      console.log(`YouTube trending API error: ${JSON.stringify(data)}`);
      return c.json({ error: data?.error?.message || "YouTube API error" }, response.status);
    }

    const videos = (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.snippet?.title,
      channel: item.snippet?.channelTitle,
      channelId: item.snippet?.channelId,
      thumbnail:
        item.snippet?.thumbnails?.maxres?.url ??
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.medium?.url,
      publishedAt: item.snippet?.publishedAt,
      viewCount: item.statistics?.viewCount,
      duration: item.contentDetails?.duration,
    }));

    return c.json({ videos, nextPageToken: data.nextPageToken || null });
  } catch (err) {
    console.log(`Error fetching trending: ${err}`);
    return c.json({ error: `Failed to fetch trending: ${err}` }, 500);
  }
});

// YouTube Batch Video Details endpoint (comma-separated IDs)
app.get("/make-server-cc7585ff/youtube/videos", async (c) => {
  const ids = c.req.query("ids");

  if (!ids) {
    return c.json({ error: "Missing 'ids' parameter" }, 400);
  }

  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) {
    return c.json({ error: "YouTube API key not configured" }, 500);
  }

  try {
    const params = new URLSearchParams({
      part: "snippet,statistics,contentDetails",
      id: ids,
      key: apiKey,
    });

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`
    );
    const data = await response.json();

    if (!response.ok) {
      return c.json({ error: data?.error?.message || "YouTube API error" }, response.status);
    }

    const videos = (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.snippet?.title,
      channel: item.snippet?.channelTitle,
      channelId: item.snippet?.channelId,
      thumbnail:
        item.snippet?.thumbnails?.maxres?.url ??
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.medium?.url ??
        "",
      viewCount: item.statistics?.viewCount,
      duration: item.contentDetails?.duration,
    }));

    return c.json({ videos });
  } catch (err) {
    console.log(`Error fetching batch videos: ${err}`);
    return c.json({ error: `Failed to fetch videos: ${err}` }, 500);
  }
});

// YouTube Channel Videos endpoint — scoped to an official artist channel
app.get("/make-server-cc7585ff/youtube/channel-videos", async (c) => {
  const channelId = c.req.query("channelId");
  const maxResults = c.req.query("maxResults") || "50";

  if (!channelId) {
    return c.json({ error: "Missing 'channelId' parameter" }, 400);
  }

  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) {
    return c.json({ error: "YouTube API key not configured" }, 500);
  }

  try {
    // Step 1: search for videos scoped to this channel, ordered by view count
    const searchParams = new URLSearchParams({
      part: "id",
      channelId,
      type: "video",
      order: "viewCount",
      maxResults,
      key: apiKey,
    });

    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`
    );
    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      console.log(`YouTube channel search error: ${JSON.stringify(searchData)}`);
      return c.json({ error: searchData?.error?.message || "YouTube API error" }, searchRes.status);
    }

    const videoIds: string[] = (searchData.items ?? [])
      .map((item: any) => item.id?.videoId)
      .filter(Boolean);

    if (!videoIds.length) {
      return c.json({ videos: [] });
    }

    // Step 2: fetch full details for those video IDs
    const detailsParams = new URLSearchParams({
      part: "snippet,contentDetails,statistics",
      id: videoIds.join(","),
      key: apiKey,
    });

    const detailsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${detailsParams.toString()}`
    );
    const detailsData = await detailsRes.json();

    if (!detailsRes.ok) {
      console.log(`YouTube video details error: ${JSON.stringify(detailsData)}`);
      return c.json({ error: detailsData?.error?.message || "YouTube API error" }, detailsRes.status);
    }

    const parseISODuration = (iso: string): number => {
      const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) return 0;
      return (
        parseInt(match[1] ?? "0", 10) * 3600 +
        parseInt(match[2] ?? "0", 10) * 60 +
        parseInt(match[3] ?? "0", 10)
      );
    };

    const videos = (detailsData.items ?? []).map((item: any) => ({
      id: item.id,
      title: item.snippet?.title,
      channelName: item.snippet?.channelTitle,
      thumbnailUrl:
        item.snippet?.thumbnails?.maxres?.url ??
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.medium?.url ??
        "",
      viewCount: parseInt(item.statistics?.viewCount ?? "0", 10),
      durationSeconds: parseISODuration(item.contentDetails?.duration ?? ""),
    }));

    return c.json({ videos });
  } catch (err) {
    console.log(`Error fetching channel videos: ${err}`);
    return c.json({ error: `Failed to fetch channel videos: ${err}` }, 500);
  }
});

// YouTube Channel Details endpoint
app.get("/make-server-cc7585ff/youtube/channels", async (c) => {
  const ids = c.req.query("ids");
  if (!ids) return c.json({ error: "Missing 'ids' parameter" }, 400);

  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) return c.json({ error: "YouTube API key not configured" }, 500);

  try {
    // Cache channel details since they change slowly and are requested often
    const channels = await withCache(
      `cache:youtube:channels:${ids}`,
      60 * 60, // 1 hour
      async () => {
        const params = new URLSearchParams({
          part: "snippet,statistics,brandingSettings",
          id: ids,
          key: apiKey,
        });

        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error?.message || "YouTube API error");
        }

        return (data.items || []).map((item: any) => ({
          id: item.id,
          name: item.snippet?.title,
          description: item.snippet?.description ?? "",
          thumbnail:
            item.snippet?.thumbnails?.high?.url ??
            item.snippet?.thumbnails?.medium?.url ??
            item.snippet?.thumbnails?.default?.url ??
            "",
          banner:
            item.brandingSettings?.image?.bannerExternalUrl ??
            item.brandingSettings?.image?.bannerImageUrl ??
            "",
          subscribers: item.statistics?.subscriberCount ?? "0",
          views: item.statistics?.viewCount ?? "0",
          videoCount: item.statistics?.videoCount ?? "0",
          customUrl: item.snippet?.customUrl ?? "",
        }));
      }
    );

    return c.json({ channels: channels ?? [] });
  } catch (err) {
    console.log(`Error fetching channels: ${err}`);
    return c.json({ error: `Failed to fetch channels: ${err}` }, 500);
  }
});

// YouTube Find Track endpoint — scoring system for niche/international artists
app.get("/make-server-cc7585ff/youtube/find-track", async (c) => {
  const artist = c.req.query("artist");
  const song   = c.req.query("song");

  if (!artist || !song) {
    return c.json({ error: "Missing 'artist' or 'song' parameter" }, 400);
  }

  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) return c.json({ error: "YouTube API key not configured" }, 500);

  // Score a single search result item
  function scoreItem(item: any): number {
    const title        = (item.snippet?.title ?? "").toLowerCase();
    const channelTitle = item.snippet?.channelTitle ?? "";
    const artistL      = artist!.toLowerCase();
    const songL        = song!.toLowerCase();
    let score = 0;

    if (title.includes(songL))              score += 3;
    if (title.includes(artistL))            score += 2;
    if (title.includes("official audio"))   score += 4;
    else if (title.includes("official"))    score += 2;
    if (title.includes("audio"))            score += 1;
    if (channelTitle.includes("- Topic"))   score += 6;  // Topic channel boost
    if (channelTitle.toLowerCase().includes(artistL)) score += 3;
    if (title.includes("cover"))            score -= 4;
    if (title.includes("live") && !title.includes("official")) score -= 2;
    if (title.includes("reaction"))         score -= 5;
    // No penalty for non-Latin characters (language-agnostic)
    return score;
  }

  async function searchYT(q: string, channelId?: string): Promise<any[]> {
    const params = new URLSearchParams({
      part: "snippet",
      q,
      type: "video",
      videoCategoryId: "10",
      maxResults: "10",
      key: apiKey!,
      ...(channelId ? { channelId } : {}),
    });
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
  }

  function pickBest(items: any[]): any | null {
    if (!items.length) return null;
    const threshold = items.length < 3 ? 2 : 4;  // Rule 1: loose threshold for few results
    const scored = items
      .map(item => ({ item, score: scoreItem(item) }))
      .sort((a, b) => b.score - a.score);
    const best = scored[0];
    return best.score >= threshold ? best.item : null;
  }

  async function getVideoDetails(videoId: string) {
    const params = new URLSearchParams({
      part: "snippet,contentDetails,statistics",
      id: videoId,
      key: apiKey!,
    });
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.items?.[0] ?? null;
  }

  function parseISODuration(iso: string): number {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    return (
      parseInt(match[1] ?? "0", 10) * 3600 +
      parseInt(match[2] ?? "0", 10) * 60 +
      parseInt(match[3] ?? "0", 10)
    );
  }

  function formatResult(detail: any) {
    return {
      id:              detail.id,
      title:           detail.snippet?.title,
      channelName:     detail.snippet?.channelTitle,
      channelId:       detail.snippet?.channelId,
      thumbnailUrl:
        detail.snippet?.thumbnails?.maxres?.url ??
        detail.snippet?.thumbnails?.high?.url ??
        detail.snippet?.thumbnails?.medium?.url ??
        "",
      viewCount:       parseInt(detail.statistics?.viewCount ?? "0", 10),
      durationSeconds: parseISODuration(detail.contentDetails?.duration ?? ""),
    };
  }

  try {
    // Rule 2: 5-query fallback chain (all with videoCategoryId:10 via searchYT)
    const queries = [
      `${artist} ${song} official audio`,
      `${artist} ${song} official`,
      `${artist} ${song} audio`,
      `${artist} ${song}`,
      `${artist} topic ${song}`,
    ];

    for (const q of queries) {
      const items = await searchYT(q);
      const best  = pickBest(items);
      if (best?.id?.videoId) {
        const detail = await getVideoDetails(best.id.videoId);
        if (detail) return c.json({ video: formatResult(detail) });
      }
    }

    // Rule 6: channel search fallback — find artist's Topic channel, then search within it
    const channelSearchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${new URLSearchParams({
        part: "snippet",
        q: `${artist} - Topic`,
        type: "channel",
        maxResults: "3",
        key: apiKey,
      }).toString()}`
    );
    if (channelSearchRes.ok) {
      const channelData = await channelSearchRes.json();
      const topicChannel = (channelData.items ?? []).find(
        (ch: any) => ch.snippet?.title?.includes("- Topic")
      );
      if (topicChannel?.id?.channelId) {
        const channelItems = await searchYT(song, topicChannel.id.channelId);
        const best = pickBest(channelItems);
        if (best?.id?.videoId) {
          const detail = await getVideoDetails(best.id.videoId);
          if (detail) return c.json({ video: formatResult(detail) });
        }
      }

      // Last resort: any channel result for the artist, search within it
      const anyChannel = channelData.items?.[0];
      if (anyChannel?.id?.channelId) {
        const channelItems = await searchYT(song, anyChannel.id.channelId);
        const best = channelItems[0];
        if (best?.id?.videoId) {
          const detail = await getVideoDetails(best.id.videoId);
          if (detail) return c.json({ video: formatResult(detail) });
        }
      }
    }

    return c.json({ video: null });
  } catch (err) {
    console.log(`Error in find-track: ${err}`);
    return c.json({ error: `Failed to find track: ${err}` }, 500);
  }
});

// ─── Cache helper ─────────────────────────────────────────────────────────────

async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (!redis) return fetcher(); // Redis not configured — call through directly
  const cached = await redis.get<T>(key);
  if (cached !== null) return cached;
  const fresh = await fetcher();
  if (fresh !== null) await redis.set(key, fresh, { ex: ttlSeconds });
  return fresh;
}

function ck(prefix: string, name: string): string {
  return `${prefix}:${name.toLowerCase().trim().replace(/\s+/g, "_")}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<a[^>]*>.*?<\/a>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const MB_SERVER_HEADERS = {
  "User-Agent": "Discova/1.0 (princeroy4102001@gmail.com)",
  Accept: "application/json",
};

// ─── Gemini endpoints ─────────────────────────────────────────────────────────

app.get("/make-server-cc7585ff/gemini/biography", async (c) => {
  const name = c.req.query("name")?.trim();
  if (!name) return c.json({ error: "Missing 'name' parameter" }, 400);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return c.json({ error: "Gemini API key not configured" }, 500);

  try {
    const data = await withCache(ck("cache:gemini:bio", name), 604800, async () => {
      const genai = new GoogleGenAI({ apiKey });
      const response = await genai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Write a concise 3-4 sentence biography of the music artist "${name}". Also list their top 3-5 music genres. Return ONLY a JSON object with no markdown: {"bio": "...", "genres": ["genre1", "genre2"]}`,
      });

      const raw = (response.text ?? "").trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "");
      try {
        return JSON.parse(raw) as { bio: string; genres: string[] };
      } catch {
        // Gemini returned plain text instead of JSON — wrap it
        return { bio: raw, genres: [] };
      }
    });

    return c.json(data);
  } catch (err) {
    console.log(`Gemini biography error: ${err}`);
    return c.json({ error: String(err) }, 500);
  }
});

// ─── Wikipedia endpoints ──────────────────────────────────────────────────────

// Artist image via MediaWiki prop=images → prop=imageinfo pipeline
app.get("/make-server-cc7585ff/wikipedia/artist-image", async (c) => {
  const name = c.req.query("name")?.trim();
  if (!name) return c.json({ error: "Missing 'name' parameter" }, 400);

  const WIKI_HEADERS = { "User-Agent": "Discova/1.0 (princeroy4102001@gmail.com)" };
  const EXCLUDE_EXT   = /\.(svg|gif)$/i;
  const EXCLUDE_WORDS = /flag|icon|logo|map|symbol|banner|signature|commons|wikipedia|wikidata/i;

  try {
    const data = await withCache(ck("cache:wiki:img", name), 604800, async () => {
      // Step 1 — get all image file names embedded on the artist's Wikipedia page
      const listUrl = new URL("https://en.wikipedia.org/w/api.php");
      listUrl.searchParams.set("action", "query");
      listUrl.searchParams.set("prop", "images");
      listUrl.searchParams.set("titles", name);
      listUrl.searchParams.set("imlimit", "20");
      listUrl.searchParams.set("format", "json");
      listUrl.searchParams.set("origin", "*");

      const listRes = await fetch(listUrl.toString(), { headers: WIKI_HEADERS });
      if (!listRes.ok) return null;
      const listData = await listRes.json();

      const pages = listData.query?.pages ?? {};
      const rawImages: Array<{ title: string }> =
        (Object.values(pages)[0] as any)?.images ?? [];

      // Keep only likely portrait photos — drop SVGs, icons, flags, etc.
      const candidates = rawImages
        .map((img) => img.title)
        .filter((t) => !EXCLUDE_EXT.test(t) && !EXCLUDE_WORDS.test(t));

      if (!candidates.length) return null;

      // Step 2 — resolve the first candidate to an actual download URL
      const infoUrl = new URL("https://en.wikipedia.org/w/api.php");
      infoUrl.searchParams.set("action", "query");
      infoUrl.searchParams.set("prop", "imageinfo");
      infoUrl.searchParams.set("iiprop", "url|size");
      infoUrl.searchParams.set("titles", candidates[0]);
      infoUrl.searchParams.set("format", "json");
      infoUrl.searchParams.set("origin", "*");

      const infoRes = await fetch(infoUrl.toString(), { headers: WIKI_HEADERS });
      if (!infoRes.ok) return null;
      const infoData = await infoRes.json();

      const infoPages = infoData.query?.pages ?? {};
      const imageInfo = (Object.values(infoPages)[0] as any)?.imageinfo?.[0];
      const imageUrl = imageInfo?.url as string | undefined;

      return imageUrl ? { imageUrl } : null;
    });

    return c.json(data ?? null);
  } catch (err) {
    console.log(`Wikipedia artist image error: ${err}`);
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/make-server-cc7585ff/wikipedia/biography", async (c) => {
  const name = c.req.query("name")?.trim();
  if (!name) return c.json({ error: "Missing 'name' parameter" }, 400);

  try {
    const data = await withCache(ck("cache:wiki:bio", name), 604800, async () => {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Discova/1.0 (princeroy4102001@gmail.com)" },
      });
      if (!res.ok) return null;
      const json = await res.json();
      const extract = json.extract?.trim() ?? "";
      if (!extract) return null;
      return { bio: extract };
    });

    return c.json(data ?? null);
  } catch (err) {
    console.log(`Wikipedia biography error: ${err}`);
    return c.json({ error: String(err) }, 500);
  }
});

// ─── Last.fm endpoints ────────────────────────────────────────────────────────

app.get("/make-server-cc7585ff/lastfm/artist", async (c) => {
  const name = c.req.query("name")?.trim();
  if (!name) return c.json({ error: "Missing 'name' parameter" }, 400);

  const apiKey = Deno.env.get("LASTFM_API_KEY");
  if (!apiKey) return c.json({ error: "Last.fm API key not configured" }, 500);

  try {
    const data = await withCache(ck("cache:lastfm:artist", name), 86400, async () => {
      // Resolve MBID via MusicBrainz for more accurate Last.fm lookup
      let mbid: string | null = null;
      try {
        const mbUrl = new URL("https://musicbrainz.org/ws/2/artist");
        mbUrl.searchParams.set("query", `artist:"${name}"`);
        mbUrl.searchParams.set("fmt", "json");
        mbUrl.searchParams.set("limit", "1");
        const mbRes = await fetch(mbUrl.toString(), { headers: MB_SERVER_HEADERS });
        if (mbRes.ok) {
          const mbData = await mbRes.json();
          mbid = mbData.artists?.[0]?.id ?? null;
        }
      } catch { /* mbid stays null */ }

      const lfmUrl = new URL("https://ws.audioscrobbler.com/2.0/");
      lfmUrl.searchParams.set("method", "artist.getinfo");
      lfmUrl.searchParams.set("api_key", apiKey);
      lfmUrl.searchParams.set("format", "json");
      lfmUrl.searchParams.set("autocorrect", "1");
      if (mbid) {
        lfmUrl.searchParams.set("mbid", mbid);
      } else {
        lfmUrl.searchParams.set("artist", name);
      }

      const lfmRes = await fetch(lfmUrl.toString());
      if (!lfmRes.ok) throw new Error(`Last.fm error: ${lfmRes.status}`);
      const lfm = await lfmRes.json();
      if (lfm.error) throw new Error(`Last.fm: ${lfm.message}`);

      const a = lfm.artist;
      return {
        name: a.name ?? name,
        mbid: a.mbid ?? mbid ?? "",
        url: a.url ?? "",
        listeners: parseInt(a.stats?.listeners ?? "0", 10),
        playcount: parseInt(a.stats?.playcount ?? "0", 10),
        tags: ((a.tags?.tag ?? []) as any[]).map((t) => t.name).slice(0, 5),
        similar: ((a.similar?.artist ?? []) as any[])
          .map((s) => ({ name: s.name, url: s.url ?? "" }))
          .slice(0, 5),
        bio: {
          summary: stripHtml(a.bio?.summary ?? ""),
          content: stripHtml(a.bio?.content ?? ""),
        },
      };
    });

    return c.json(data);
  } catch (err) {
    console.log(`Last.fm artist error: ${err}`);
    return c.json({ error: String(err) }, 500);
  }
});

// Last.fm similar artists — dedicated getsimilar call (up to 20 results)
app.get("/make-server-cc7585ff/lastfm/similar", async (c) => {
  const name = c.req.query("name")?.trim();
  if (!name) return c.json({ error: "Missing 'name' parameter" }, 400);

  const apiKey = Deno.env.get("LASTFM_API_KEY");
  if (!apiKey) return c.json({ error: "Last.fm API key not configured" }, 500);

  try {
    const artists = await withCache(ck("cache:lastfm:similar", name), 86400, async () => {
      const url = new URL("https://ws.audioscrobbler.com/2.0/");
      url.searchParams.set("method", "artist.getsimilar");
      url.searchParams.set("artist", name);
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "20");
      url.searchParams.set("autocorrect", "1");

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Last.fm error: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(`Last.fm: ${data.message}`);

      return ((data.similarartists?.artist ?? []) as any[]).map((a) => ({
        name: a.name as string,
        url: a.url as string,
        match: parseFloat(a.match ?? "0"),
      }));
    });

    return c.json({ artists });
  } catch (err) {
    console.log(`Last.fm similar error: ${err}`);
    return c.json({ error: String(err) }, 500);
  }
});

// ─── MusicBrainz endpoints ────────────────────────────────────────────────────

app.get("/make-server-cc7585ff/musicbrainz/artist", async (c) => {
  const name = c.req.query("name")?.trim();
  if (!name) return c.json({ error: "Missing 'name' parameter" }, 400);

  try {
    const data = await withCache(ck("cache:mb:artist", name), 604800, async () => {
      const searchUrl = new URL("https://musicbrainz.org/ws/2/artist");
      searchUrl.searchParams.set("query", `artist:"${name}"`);
      searchUrl.searchParams.set("fmt", "json");
      searchUrl.searchParams.set("limit", "1");

      const searchRes = await fetch(searchUrl.toString(), { headers: MB_SERVER_HEADERS });
      if (!searchRes.ok) return null;

      const { artists } = await searchRes.json();
      const mbid: string | undefined = artists?.[0]?.id;
      if (!mbid) return null;

      const detailRes = await fetch(
        `https://musicbrainz.org/ws/2/artist/${mbid}?inc=annotation&fmt=json`,
        { headers: MB_SERVER_HEADERS },
      );
      if (!detailRes.ok) return null;

      const detail = await detailRes.json();
      const annotation: string = detail.annotation ?? "";
      if (!annotation) return null;

      return { bio: annotation };
    });

    return c.json(data ?? null);
  } catch (err) {
    console.log(`MusicBrainz artist error: ${err}`);
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/make-server-cc7585ff/musicbrainz/timeline", async (c) => {
  const name = c.req.query("name")?.trim();
  if (!name) return c.json({ error: "Missing 'name' parameter" }, 400);

  const MONTH_NAMES: Record<string, string> = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
    "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
    "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
  };

  function parseMbDate(raw: string) {
    if (!raw?.trim()) return null;
    const parts = raw.trim().split("-");
    const year = parseInt(parts[0], 10);
    if (isNaN(year)) return null;
    const monthKey = parts[1] ?? null;
    return {
      year,
      month: monthKey ? (MONTH_NAMES[monthKey] ?? monthKey) : null,
      day: parts[2] ? parseInt(parts[2], 10) : null,
    };
  }

  try {
    const entries = await withCache(ck("cache:mb:timeline", name), 86400, async () => {
      const searchUrl = new URL("https://musicbrainz.org/ws/2/artist");
      searchUrl.searchParams.set("query", `artist:"${name}"`);
      searchUrl.searchParams.set("fmt", "json");
      searchUrl.searchParams.set("limit", "1");

      const searchRes = await fetch(searchUrl.toString(), { headers: MB_SERVER_HEADERS });
      if (!searchRes.ok) throw new Error(`MusicBrainz search failed: ${searchRes.status}`);
      const searchData = await searchRes.json();

      const mbid: string | undefined = searchData.artists?.[0]?.id;
      if (!mbid) return [];

      const rgUrl = new URL("https://musicbrainz.org/ws/2/release-group");
      rgUrl.searchParams.set("artist", mbid);
      rgUrl.searchParams.set("limit", "100");
      rgUrl.searchParams.set("offset", "0");
      rgUrl.searchParams.set("fmt", "json");

      const rgRes = await fetch(rgUrl.toString(), { headers: MB_SERVER_HEADERS });
      if (!rgRes.ok) throw new Error(`MusicBrainz release groups failed: ${rgRes.status}`);
      const rgData = await rgRes.json();

      const result: any[] = [];
      for (const rg of rgData["release-groups"] ?? []) {
        const parsed = parseMbDate(rg["first-release-date"]);
        if (!parsed) continue;
        result.push({
          year: parsed.year,
          month: parsed.month,
          day: parsed.day,
          title: rg.title,
          type: rg["primary-type"] ?? "Unknown",
          highlight: rg["primary-type"] === "Album",
        });
      }
      return result;
    });

    return c.json({ entries });
  } catch (err) {
    console.log(`MusicBrainz timeline error: ${err}`);
    return c.json({ error: String(err) }, 500);
  }
});

// ─── AudioDB endpoints ────────────────────────────────────────────────────────

app.get("/make-server-cc7585ff/audiodb/artist", async (c) => {
  const name = c.req.query("name")?.trim();
  if (!name) return c.json({ error: "Missing 'name' parameter" }, 400);

  const apiKey = Deno.env.get("AUDIODB_API_KEY") ?? "123";

  try {
    const data = await withCache(ck("cache:audiodb:artist", name), 604800, async () => {
      const url = `https://www.theaudiodb.com/api/v1/json/${apiKey}/search.php?s=${encodeURIComponent(name)}`;
      const res = await fetch(url);
      if (!res.ok) return null;

      const json = await res.json();
      const artist = json?.artists?.[0];
      if (!artist) return null;

      return {
        name: artist.strArtist ?? name,
        bio: artist.strBiographyEN || "",
        genre: artist.strGenre || "",
        formedYear: artist.intFormedYear ? String(artist.intFormedYear) : null,
        website: artist.strWebsite
          ? artist.strWebsite.startsWith("http")
            ? artist.strWebsite
            : `https://${artist.strWebsite}`
          : null,
      };
    });

    return c.json(data ?? null);
  } catch (err) {
    console.log(`AudioDB artist error: ${err}`);
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/make-server-cc7585ff/audiodb/discography", async (c) => {
  const name = c.req.query("name")?.trim();
  if (!name) return c.json({ error: "Missing 'name' parameter" }, 400);

  const apiKey = Deno.env.get("AUDIODB_API_KEY") ?? "123";

  try {
    const entries = await withCache(ck("cache:audiodb:discography", name), 86400, async () => {
      const url = `https://www.theaudiodb.com/api/v1/json/${apiKey}/discography.php?s=${encodeURIComponent(name)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`AudioDB discography failed: ${res.status}`);
      const data = await res.json();

      return (data.album ?? [])
        .filter((a: any) => a.intYearReleased && !isNaN(parseInt(a.intYearReleased, 10)))
        .map((a: any) => {
          const type = a.strReleaseFormat ?? "Album";
          return {
            year: parseInt(a.intYearReleased, 10),
            month: null,
            day: null,
            title: a.strAlbum,
            type,
            highlight: type === "Album",
          };
        });
    });

    return c.json({ entries });
  } catch (err) {
    console.log(`AudioDB discography error: ${err}`);
    return c.json({ error: String(err) }, 500);
  }
});

// ─── KV Store endpoints (use service-role key, bypass RLS) ───────────────────
import * as kv from "./kv_store.tsx";

app.get("/make-server-cc7585ff/kv/:key", async (c) => {
  const key = c.req.param("key");
  try {
    const value = await kv.get(key);
    return c.json({ value: value ?? null });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.post("/make-server-cc7585ff/kv/:key", async (c) => {
  const key = c.req.param("key");
  try {
    const body = await c.req.json();
    await kv.set(key, body.value);
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

Deno.serve(app.fetch);