import { useQuery } from '@tanstack/react-query';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;

interface MusicBrainzArtist {
  bio: string;
}

async function fetchMusicBrainzBio(artistName: string): Promise<MusicBrainzArtist | null> {
  const url = `${BASE_URL}/musicbrainz/artist?name=${encodeURIComponent(artistName)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export function useMusicBrainzArtist(artistName: string) {
  return useQuery({
    queryKey: ['musicbrainz', 'artist', artistName],
    queryFn: () => fetchMusicBrainzBio(artistName),
    enabled: !!artistName,
    staleTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
