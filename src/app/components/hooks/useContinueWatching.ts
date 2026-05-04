import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const EDGE_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;
const HISTORY_KEY = 'library:history:v2';

interface RawHistoryVideo {
  id: string;
  videoId: string;
  watchedAt: string;
  progressSeconds: number;
  totalSeconds: number;
}

export interface ContinueWatchingVideo {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  progress: number;
}

const authHeaders = { Authorization: `Bearer ${publicAnonKey}` };

const ytThumb = (videoId: string) => `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

const fetchContinueWatching = async (
  userId: string,
  signal?: AbortSignal,
): Promise<ContinueWatchingVideo[]> => {
  const key = `${HISTORY_KEY}:${userId || 'anon'}`;
  const kvRes = await fetch(`${EDGE_BASE}/kv/${encodeURIComponent(key)}`, {
    signal,
    headers: authHeaders,
  });
  const kvJson = kvRes.ok ? await kvRes.json() : { value: null };
  const history: RawHistoryVideo[] = (kvJson?.value as RawHistoryVideo[]) ?? [];

  // Only show videos that aren't fully watched (< 95% done), most recent first
  const recent = history
    .filter((v) => v.progressSeconds < v.totalSeconds * 0.95)
    .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime())
    .slice(0, 3);

  if (recent.length === 0) return [];

  // Batch fetch video metadata via the /youtube/videos endpoint
  const ids = recent.map((v) => v.videoId).join(',');
  try {
    const res = await fetch(`${EDGE_BASE}/youtube/videos?ids=${encodeURIComponent(ids)}`, {
      signal,
      headers: authHeaders,
    });
    const data = res.ok ? await res.json() : { videos: [] };
    const metaById: Record<string, { title: string; channel: string; thumbnail: string }> =
      Object.fromEntries((data.videos ?? []).map((m: any) => [m.id, m]));

    return recent.map((h) => {
      const meta = metaById[h.videoId];
      return {
        id: h.id,
        videoId: h.videoId,
        title: meta?.title ?? 'Loading…',
        artist: meta?.channel ?? '',
        thumbnail: meta?.thumbnail ?? ytThumb(h.videoId),
        progress: Math.round((h.progressSeconds / h.totalSeconds) * 100),
      };
    });
  } catch {
    // Fallback: show thumbnails without metadata
    return recent.map((h) => ({
      id: h.id,
      videoId: h.videoId,
      title: 'Loading…',
      artist: '',
      thumbnail: ytThumb(h.videoId),
      progress: Math.round((h.progressSeconds / h.totalSeconds) * 100),
    }));
  }
};

export function useContinueWatching() {
  const { data: userId } = useQuery({
    queryKey: ['auth', 'userId'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.user?.id ?? 'anon';
    },
    staleTime: 10_000,
    retry: 0,
  });

  return useQuery({
    queryKey: ['continue-watching', userId ?? 'anon'],
    queryFn: ({ signal }) => fetchContinueWatching(userId ?? 'anon', signal),
    staleTime: 2 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
