import { useQuery } from '@tanstack/react-query';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;
const authHeaders = { Authorization: `Bearer ${publicAnonKey}` };

export interface TrendingArtist {
  id: string;
  name: string;
  image: string;
  genre: string;
  tagline: string;
  listeners: string;
}

function formatSubscribers(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

const MUSIC_GENRES = ['Pop', 'Hip-Hop', 'R&B', 'Rock', 'Electronic', 'Country', 'Latin', 'Indie'];

const fetchTrendingArtists = async (signal?: AbortSignal): Promise<TrendingArtist[]> => {
  // Step 1: get trending music videos to extract unique channel IDs
  const trendingRes = await fetch(
    `${BASE_URL}/youtube/trending?regionCode=US&maxResults=20`,
    { signal, headers: authHeaders },
  );
  if (!trendingRes.ok) throw new Error('Trending fetch failed');
  const trendingData = await trendingRes.json();

  const seen = new Set<string>();
  const channelIds: string[] = [];
  for (const v of trendingData.videos ?? []) {
    if (v.channelId && !seen.has(v.channelId)) {
      seen.add(v.channelId);
      channelIds.push(v.channelId);
    }
    if (channelIds.length >= 4) break;
  }

  if (channelIds.length === 0) throw new Error('No channels found');

  // Step 2: fetch channel details (avatar, subscriber count, description)
  const channelsRes = await fetch(
    `${BASE_URL}/youtube/channels?ids=${encodeURIComponent(channelIds.join(','))}`,
    { signal, headers: authHeaders },
  );
  if (!channelsRes.ok) throw new Error('Channels fetch failed');
  const channelsData = await channelsRes.json();

  return (channelsData.channels ?? []).map((ch: any, i: number): TrendingArtist => {
    const subs = parseInt(ch.subscribers ?? '0', 10);
    const desc: string = ch.description ?? '';
    const tagline = desc.length > 80 ? desc.slice(0, 77).trimEnd() + '…' : desc || 'Trending on YouTube this week';
    return {
      id: ch.id,
      name: ch.name,
      image: ch.thumbnail,
      genre: MUSIC_GENRES[i % MUSIC_GENRES.length],
      tagline,
      listeners: subs > 0 ? `${formatSubscribers(subs)} subscribers` : 'YouTube Artist',
    };
  });
};

export function useTrendingArtists() {
  return useQuery({
    queryKey: ['trending-artists'],
    queryFn: ({ signal }) => fetchTrendingArtists(signal),
    staleTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
