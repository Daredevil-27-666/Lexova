import { useQuery } from '@tanstack/react-query';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimilarArtist {
  name: string;
  url: string;
}

export interface LastFmArtistData {
  name: string;
  mbid: string;
  url: string;
  listeners: number;
  playcount: number;
  tags: string[];
  similar: SimilarArtist[];
  bio: {
    summary: string;
    content: string;
  };
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchLastFmArtist(
  artistName: string,
  signal?: AbortSignal,
): Promise<LastFmArtistData> {
  const url = `${BASE_URL}/lastfm/artist?name=${encodeURIComponent(artistName)}`;
  const res = await fetch(url, {
    signal,
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
  if (!res.ok) throw new Error(`Last.fm proxy error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as LastFmArtistData;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLastFmArtist(artistName: string) {
  return useQuery({
    queryKey: ['lastfm-artist', artistName.toLowerCase().trim()],
    queryFn: ({ signal }) => fetchLastFmArtist(artistName.trim(), signal),
    enabled: !!artistName.trim(),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
