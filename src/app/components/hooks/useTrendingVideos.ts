import { useQuery } from '@tanstack/react-query';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export interface TrendingVideo {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  views: string;
}

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;

function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  const h = parseInt(match[1] ?? '0', 10);
  const m = parseInt(match[2] ?? '0', 10);
  const s = parseInt(match[3] ?? '0', 10);
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function formatViews(n: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

function mapVideo(v: any): TrendingVideo {
  return {
    id: v.id,
    title: v.title,
    artist: v.channel,
    thumbnail: v.thumbnail,
    duration: v.duration ? formatDuration(v.duration) : '—',
    views: v.viewCount ? formatViews(parseInt(v.viewCount, 10)) : '—',
  };
}

const authHeaders = { Authorization: `Bearer ${publicAnonKey}` };

// No query → real YouTube Music trending chart
const fetchTrendingChart = async (
  maxResults: number,
  signal?: AbortSignal,
): Promise<TrendingVideo[]> => {
  const res = await fetch(
    `${BASE_URL}/youtube/trending?regionCode=US&maxResults=${maxResults}`,
    { signal, headers: authHeaders },
  );
  if (res.ok) {
    const data = await res.json();
    const videos = (data.videos ?? []).map(mapVideo);
    if (videos.length > 0) return videos;
  }
  // Fallback to search if trending endpoint not yet deployed
  const searchRes = await fetch(
    `${BASE_URL}/youtube/search?q=${encodeURIComponent('music trending')}&maxResults=${maxResults}`,
    { signal, headers: authHeaders },
  );
  if (!searchRes.ok) throw new Error('Trending fetch failed');
  const searchData = await searchRes.json();
  return (searchData.videos ?? []).map(mapVideo);
};

// Query provided → genre/keyword search (used by Explore for personalized results)
const fetchSearchVideos = async (
  query: string,
  maxResults: number,
  signal?: AbortSignal,
): Promise<TrendingVideo[]> => {
  const res = await fetch(
    `${BASE_URL}/youtube/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    { signal, headers: authHeaders },
  );
  if (!res.ok) throw new Error('Search fetch failed');
  const data = await res.json();
  return (data.videos ?? []).map(mapVideo);
};

export function useTrendingVideos(queryOrMax?: string | number, maxResults = 8) {
  const hasQuery = typeof queryOrMax === 'string';
  const query = hasQuery ? queryOrMax : undefined;
  const count = hasQuery ? maxResults : (typeof queryOrMax === 'number' ? queryOrMax : maxResults);

  return useQuery({
    queryKey: hasQuery
      ? ['trending-videos', 'search', query, count]
      : ['trending-videos', 'chart', count],
    queryFn: ({ signal }) =>
      hasQuery
        ? fetchSearchVideos(query!, count, signal)
        : fetchTrendingChart(count, signal),
    staleTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
