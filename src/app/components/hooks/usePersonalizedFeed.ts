import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const EDGE_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;
const KV_TABLE = 'kv_store_cc7585ff';
const FOLLOWING_KEY = 'library:following:v2';

export interface PersonalizedVideo {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  reason: string;
}

interface FollowedArtist {
  id: string;
  name: string;
  genre: string;
}

const authHeaders = { Authorization: `Bearer ${publicAnonKey}` };

const fetchPersonalizedFeed = async (
  signal?: AbortSignal,
): Promise<PersonalizedVideo[]> => {
  const { data: kvData } = await supabase
    .from(KV_TABLE)
    .select('value')
    .eq('key', FOLLOWING_KEY)
    .maybeSingle();

  const following: FollowedArtist[] = kvData?.value ?? [];
  if (following.length === 0) return [];

  // Fetch 2 videos per artist for the top 3 followed artists in parallel
  const results = await Promise.all(
    following.slice(0, 3).map(async (artist) => {
      try {
        const url = `${EDGE_BASE}/youtube/search?q=${encodeURIComponent(artist.name)}&maxResults=2`;
        const res = await fetch(url, { signal, headers: authHeaders });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.videos ?? []).map((v: any): PersonalizedVideo => ({
          id: v.id,
          title: v.title,
          artist: v.channel || artist.name,
          thumbnail: v.thumbnail,
          reason: `Because you follow ${artist.name}`,
        }));
      } catch {
        return [];
      }
    }),
  );

  return results.flat().filter((v) => !!v.id);
};

export function usePersonalizedFeed(isLoggedIn: boolean) {
  return useQuery({
    queryKey: ['personalized-feed'],
    queryFn: ({ signal }) => fetchPersonalizedFeed(signal),
    enabled: isLoggedIn,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
