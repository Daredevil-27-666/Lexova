import { useQuery } from '@tanstack/react-query';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;

export interface SimilarArtist {
  name: string;
  url: string;
  match: number;
}

async function fetchSimilarArtists(
  artistName: string,
  signal?: AbortSignal,
): Promise<SimilarArtist[]> {
  const res = await fetch(
    `${BASE_URL}/lastfm/similar?name=${encodeURIComponent(artistName)}`,
    { signal, headers: { Authorization: `Bearer ${publicAnonKey}` } },
  );
  if (!res.ok) throw new Error(`Similar artists fetch failed: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.artists ?? [];
}

export function useSimilarArtists(artistName: string) {
  return useQuery({
    queryKey: ['lastfm-similar', artistName.toLowerCase().trim()],
    queryFn: ({ signal }) => fetchSimilarArtists(artistName.trim(), signal),
    enabled: !!artistName.trim(),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
