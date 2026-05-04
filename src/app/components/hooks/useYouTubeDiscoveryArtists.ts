import { useQuery } from '@tanstack/react-query';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import type { DiscoveryArtist } from './useLibraryData';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;
const AUTH = { Authorization: `Bearer ${publicAnonKey}` };

const GENRE_QUERIES: Array<{ genre: string; query: string }> = [
  { genre: 'Neo-Soul',    query: 'neo soul music artist live performance' },
  { genre: 'Jazz',        query: 'jazz musician live performance 2024' },
  { genre: 'Classical',   query: 'classical piano concert performance' },
  { genre: 'Electronic',  query: 'electronic music producer live set' },
  { genre: 'Indie Folk',  query: 'indie folk singer songwriter acoustic' },
  { genre: 'Afrobeat',    query: 'afrobeat music artist live' },
];

async function searchOneArtist(
  genre: string,
  query: string,
  signal?: AbortSignal,
): Promise<DiscoveryArtist | null> {
  // Step 1: search for a video matching the genre query
  const searchRes = await fetch(
    `${BASE_URL}/youtube/search?q=${encodeURIComponent(query)}&maxResults=1`,
    { signal, headers: AUTH },
  );
  if (!searchRes.ok) return null;
  const searchData = await searchRes.json();
  const video = searchData.videos?.[0];
  if (!video?.id) return null;

  // Step 2: fetch video details to get channelId (not in search response)
  const detailRes = await fetch(
    `${BASE_URL}/youtube/video?id=${encodeURIComponent(video.id)}`,
    { signal, headers: AUTH },
  );
  if (!detailRes.ok) return null;
  const detail = await detailRes.json();
  if (!detail?.channelId) return null;

  return {
    id: detail.channelId as string,
    name: detail.channel ?? video.channel ?? 'Unknown Artist',
    image: video.thumbnail ?? '',
    genre,
    origin: '',
    hook: detail.title ?? video.title ?? '',
  };
}

export function useYouTubeDiscoveryArtists() {
  return useQuery({
    queryKey: ['explore', 'yt-discovery-artists'],
    queryFn: async ({ signal }) => {
      const settled = await Promise.allSettled(
        GENRE_QUERIES.map(({ genre, query }) => searchOneArtist(genre, query, signal)),
      );

      const artists: DiscoveryArtist[] = [];
      const seen = new Set<string>();

      for (const result of settled) {
        if (result.status === 'fulfilled' && result.value) {
          const key = result.value.id;
          if (!seen.has(key)) {
            seen.add(key);
            artists.push(result.value);
          }
        }
      }

      return artists;
    },
    staleTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
