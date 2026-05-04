import { useQuery } from '@tanstack/react-query';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;

export interface GenreVideo {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
}

// Queries tuned to return individual tracks, not compilations
const GENRE_QUERIES: Record<string, string> = {
  'Pop':        'pop official music video',
  'Rock':       'rock official music video',
  'Hip-Hop':    'hip hop official music video',
  'Country':    'country official music video',
  'Jazz':       'jazz live performance song',
  'Classical':  'classical music performance',
  'Electronic': 'electronic official music video',
  'Neo-Soul':   'neo soul official music video',
  'Indie':      'indie official music video',
  'World':      'world music official video',
};

const fetchGenreVideos = async (genre: string, signal?: AbortSignal): Promise<GenreVideo[]> => {
  const q = GENRE_QUERIES[genre] ?? `${genre} official music video`;
  // videoDuration=medium (4–20 min) excludes long compilations/playlists
  const url = `${BASE_URL}/youtube/search?q=${encodeURIComponent(q)}&maxResults=4&videoDuration=medium`;
  const res = await fetch(url, {
    signal,
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
  if (!res.ok) throw new Error('Genre fetch failed');
  const data = await res.json();
  return (data.videos ?? []).map((v: any): GenreVideo => ({
    id: v.id,
    title: v.title,
    artist: v.channel,
    thumbnail: v.thumbnail,
  }));
};

export function useGenreVideos(genre: string) {
  return useQuery({
    queryKey: ['genre-videos', genre],
    queryFn: ({ signal }) => fetchGenreVideos(genre, signal),
    enabled: !!genre && genre !== 'All',
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
