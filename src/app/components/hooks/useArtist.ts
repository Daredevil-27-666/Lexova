import { useQuery } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArtistStats {
  monthlyListeners: number; // Maps to YouTube Subscriber Count
  playCount: number;        // Maps to YouTube Total View Count
  videoCount: number;       // Maps to YouTube Video Count
}

export interface Artist {
  id: string;               // YouTube Channel ID
  name: string;             // Channel Title
  avatarUrl: string;        // Channel Thumbnail
  bannerUrl?: string;       // Channel banner image (wide)
  isFeatured?: boolean;
  genres: string[];         // Last.fm tags, or YouTube channel keywords as fallback
  bio: string;              // Last.fm biography, or YouTube description as fallback
  stats: ArtistStats;
}

// YouTube API Response Shapes
interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

interface YouTubeSnippet {
  title: string;
  description: string;
  customUrl?: string;
  publishedAt: string;
  thumbnails: {
    default: YouTubeThumbnail;
    medium: YouTubeThumbnail;
    high: YouTubeThumbnail;
  };
  keywords?: string[];
}

interface YouTubeStatistics {
  viewCount: string;
  subscriberCount: string;
  videoCount: string;
  hiddenSubscriberCount: boolean;
}

interface YouTubeChannelItem {
  id: string;
  snippet: YouTubeSnippet;
  statistics: YouTubeStatistics;
  brandingSettings?: {
    channel?: {
      keywords?: string;
    };
  };
}

interface YouTubeChannelResponse {
  items: YouTubeChannelItem[];
  pageInfo: { totalResults: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const YOUTUBE_ID_RE = /^[\w-]{20,50}$/;

export const FALLBACK_ARTIST: Artist = {
  id: 'UC51wQ7wUpvWxFUYJIRLhwGQ',
  name: 'Coldplay',
  avatarUrl:
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=512&auto=format&fit=crop',
  bannerUrl:
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1600&auto=format&fit=crop',
  isFeatured: true,
  genres: ['Rock', 'Pop', 'Alternative'],
  bio: 'Coldplay are a British rock band formed in London in 1998, consisting of vocalist and pianist Chris Martin, guitarist Jonny Buckland, bassist Guy Berryman, and drummer Will Champion.',
  stats: { monthlyListeners: 15_000_000, playCount: 10_000_000_000, videoCount: 150 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseKeywords = (keywords?: string): string[] => {
  if (!keywords) return ['Music'];
  return keywords.match(/(\"[^\"]+\"|[^\"\\s]+)/g)?.map(k => k.replace(/\"/g, '')).slice(0, 3) || ['Music'];
};

// ─── Bio fetcher: Gemini (via edge function, Redis-cached) ────────────────────

import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

const EDGE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;

interface ArtistBioResult {
  bio: string;
  tags: string[];
}

async function fetchArtistBio(
  artistName: string,
  signal?: AbortSignal,
): Promise<ArtistBioResult> {
  // 1. Gemini — AI-generated bio + genres, cached 7 days
  try {
    const res = await fetch(
      `${EDGE_URL}/gemini/biography?name=${encodeURIComponent(artistName)}`,
      { signal, headers: { Authorization: `Bearer ${publicAnonKey}` } },
    );
    if (res.ok) {
      const data = await res.json();
      if (data.bio) return { bio: data.bio, tags: data.genres ?? [] };
    }
  } catch { /* fall through */ }

  // 2. Wikipedia — factual summary, cached 7 days
  try {
    const res = await fetch(
      `${EDGE_URL}/wikipedia/biography?name=${encodeURIComponent(artistName)}`,
      { signal, headers: { Authorization: `Bearer ${publicAnonKey}` } },
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.bio) return { bio: data.bio, tags: [] };
    }
  } catch { /* fall through */ }

  return { bio: '', tags: [] };
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetchArtistData = async (
  artistId: string,
  signal?: AbortSignal,
): Promise<Artist> => {
  if (!artistId || !YOUTUBE_ID_RE.test(artistId)) {
    console.warn('Invalid YouTube ID provided, returning fallback.');
    return FALLBACK_ARTIST;
  }

  // Fetch channel details via edge function (cached server-side)
  const channelsRes = await fetch(
    `${EDGE_URL}/youtube/channels?ids=${encodeURIComponent(artistId)}`,
    { signal, headers: { Authorization: `Bearer ${publicAnonKey}` } },
  );
  if (!channelsRes.ok) {
    const err = await channelsRes.json().catch(() => ({}));
    throw new Error(err?.error ?? `Failed to fetch channel (${channelsRes.status})`);
  }
  const channelsData: { channels?: Array<{
    id: string;
    name?: string;
    description?: string;
    thumbnail?: string;
    banner?: string;
    subscribers?: string;
    views?: string;
    videoCount?: string;
  }> } = await channelsRes.json();

  const channel = channelsData.channels?.[0];
  if (!channel?.id) throw new Error('Artist channel not found on YouTube.');

  const artistName = channel.name ?? 'Unknown Artist';

  // Fetch bio from Last.fm (via MusicBrainz MBID) — runs after we have the name
  const { bio, tags } = await fetchArtistBio(artistName, signal);

  return {
    id: channel.id,
    name: artistName,
    avatarUrl: channel.thumbnail ?? FALLBACK_ARTIST.avatarUrl,
    bannerUrl: channel.banner || channel.thumbnail || FALLBACK_ARTIST.bannerUrl,
    isFeatured: false,
    genres: tags.length > 0 ? tags : ['Music'],
    bio: bio || channel.description || 'No biography available.',
    stats: {
      monthlyListeners: parseInt(channel.subscribers ?? '0', 10) || 0,
      playCount: parseInt(channel.views ?? '0', 10) || 0,
      videoCount: parseInt(channel.videoCount ?? '0', 10) || 0,
    },
  };
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useArtist(artistId: string = '') {
  return useQuery({
    queryKey: ['artist', artistId],
    queryFn: ({ signal }) => fetchArtistData(artistId, signal),
    staleTime: 5 * 60 * 1000,
    placeholderData: FALLBACK_ARTIST,
    retry: 1,
    enabled: !!artistId,
  });
}
