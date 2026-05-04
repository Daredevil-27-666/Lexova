import { useQuery } from '@tanstack/react-query';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import type { TrendingArtist } from './useTrendingArtists';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;
const AUTH = { Authorization: `Bearer ${publicAnonKey}` };

const GENRE_QUERIES: Record<string, string> = {
  'Rock':       'rock band music artist official',
  'Hip-Hop':    'hip hop rapper artist official',
  'Country':    'country music artist official',
  'Jazz':       'jazz musician live performance',
  'Classical':  'classical music pianist composer',
  'Electronic': 'electronic music producer artist',
};

function formatSubscribers(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

async function getChannelIdFromVideo(videoId: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/youtube/video?id=${encodeURIComponent(videoId)}`, { signal, headers: AUTH });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.channelId as string) ?? null;
  } catch {
    return null;
  }
}

async function fetchChannelDetails(channelIds: string[], genre: string, signal?: AbortSignal): Promise<TrendingArtist[]> {
  if (!channelIds.length) return [];
  const res = await fetch(
    `${BASE_URL}/youtube/channels?ids=${encodeURIComponent(channelIds.join(','))}`,
    { signal, headers: AUTH },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.channels ?? []).map((ch: any): TrendingArtist => {
    const subs = parseInt(ch.subscribers ?? '0', 10);
    const desc: string = ch.description ?? '';
    return {
      id: ch.id,
      name: ch.name,
      image: ch.thumbnail,
      genre,
      tagline: desc.length > 80 ? desc.slice(0, 77).trimEnd() + '…' : desc || 'YouTube Artist',
      listeners: subs > 0 ? `${formatSubscribers(subs)} subscribers` : 'YouTube Artist',
    };
  });
}

async function fetchPopArtists(signal?: AbortSignal): Promise<TrendingArtist[]> {
  const res = await fetch(
    `${BASE_URL}/youtube/trending?regionCode=US&maxResults=20`,
    { signal, headers: AUTH },
  );
  if (!res.ok) throw new Error('Trending failed');
  const data = await res.json();

  const seen = new Set<string>();
  const channelIds: string[] = [];
  for (const v of data.videos ?? []) {
    if (v.channelId && !seen.has(v.channelId)) {
      seen.add(v.channelId);
      channelIds.push(v.channelId);
    }
    if (channelIds.length >= 6) break;
  }
  return fetchChannelDetails(channelIds, 'Pop', signal);
}

async function fetchGenreArtists(genre: string, signal?: AbortSignal): Promise<TrendingArtist[]> {
  if (genre === 'Pop') return fetchPopArtists(signal);

  const q = GENRE_QUERIES[genre] ?? `${genre} music artist`;
  const searchRes = await fetch(
    `${BASE_URL}/youtube/search?q=${encodeURIComponent(q)}&maxResults=10`,
    { signal, headers: AUTH },
  );
  if (!searchRes.ok) throw new Error('Search failed');
  const searchData = await searchRes.json();
  const videos: Array<{ id: string }> = searchData.videos ?? [];

  // Resolve each video to a channelId in parallel
  const resolved = await Promise.allSettled(
    videos.map((v) => getChannelIdFromVideo(v.id, signal)),
  );

  const seen = new Set<string>();
  const channelIds: string[] = [];
  for (const r of resolved) {
    if (r.status === 'fulfilled' && r.value && !seen.has(r.value)) {
      seen.add(r.value);
      channelIds.push(r.value);
    }
    if (channelIds.length >= 6) break;
  }

  return fetchChannelDetails(channelIds, genre, signal);
}

export function useGenreArtists(genre: string) {
  return useQuery<TrendingArtist[]>({
    queryKey: ['genre-artists', genre],
    queryFn: ({ signal }) => fetchGenreArtists(genre, signal),
    enabled: !!genre,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
