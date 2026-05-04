import { useQuery } from '@tanstack/react-query';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;

export interface AudioDbArtistData {
  name: string;
  bio: string;
  genre: string;
  formedYear: string | null;
  website: string | null;
}

async function fetchAudioDbArtist(
  artistName: string,
  signal?: AbortSignal,
): Promise<AudioDbArtistData | null> {
  const url = `${BASE_URL}/audiodb/artist?name=${encodeURIComponent(artistName)}`;
  const res = await fetch(url, {
    signal,
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export function useAudioDbArtist(artistName: string) {
  return useQuery({
    queryKey: ['audiodb-artist', artistName.toLowerCase().trim()],
    queryFn: ({ signal }) => fetchAudioDbArtist(artistName.trim(), signal),
    enabled: !!artistName.trim(),
    staleTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
