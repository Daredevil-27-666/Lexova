import { useQuery } from '@tanstack/react-query';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import type { RecommendedVideo } from '../RecommendationsSidebar';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;
const authHeaders = { Authorization: `Bearer ${publicAnonKey}` };

const fetchArtistVideos = async (
  channelId: string,
  signal?: AbortSignal,
): Promise<RecommendedVideo[]> => {
  const res = await fetch(
    `${BASE_URL}/youtube/channel-videos?channelId=${encodeURIComponent(channelId)}&maxResults=50`,
    { signal, headers: authHeaders },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Channel videos fetch failed (${res.status})`);
  }

  const data = await res.json();
  return data.videos ?? [];
};

export function useArtistVideos(channelId: string) {
  return useQuery({
    queryKey: ['artistVideos', channelId],
    queryFn: ({ signal }) => fetchArtistVideos(channelId, signal),
    enabled: !!channelId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
