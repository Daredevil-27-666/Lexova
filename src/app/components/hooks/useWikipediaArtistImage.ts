import { useQuery } from '@tanstack/react-query';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;

async function fetchArtistImage(name: string, signal?: AbortSignal): Promise<string | null> {
  const res = await fetch(
    `${BASE_URL}/wikipedia/artist-image?name=${encodeURIComponent(name)}`,
    { signal, headers: { Authorization: `Bearer ${publicAnonKey}` } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.imageUrl ?? null;
}

export function useWikipediaArtistImage(artistName: string) {
  return useQuery({
    queryKey: ['wikipedia-artist-image', artistName.toLowerCase().trim()],
    queryFn: ({ signal }) => fetchArtistImage(artistName.trim(), signal),
    enabled: !!artistName.trim(),
    staleTime: 7 * 24 * 60 * 60 * 1000,
    retry: false,
  });
}
