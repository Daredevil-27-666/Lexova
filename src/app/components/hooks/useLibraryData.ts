import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { projectId, publicAnonKey } from '/utils/supabase/info';

function useAuthedUserId(): string {
  const { data } = useQuery({
    queryKey: ['auth', 'userId'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.user?.id ?? null;
    },
    staleTime: 10_000,
    retry: 0,
  });
  return data ?? 'anon';
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Playlist {
  readonly id: string;
  readonly name: string;
  readonly trackCount: number;
  readonly thumbnail: string;
  readonly updatedAt: string;
}

export interface FollowedArtist {
  readonly id: string;
  readonly name: string;
  readonly genre: string;
  readonly watchProgress: number;
  readonly deepDive: boolean;
  readonly lastActive: string;
  readonly avatar: string;
}

export interface WatchLaterVideo {
  readonly id: string;
  readonly videoId: string;
  readonly addedAt: string;
}

export interface HistoryVideo {
  readonly id: string;
  readonly videoId: string;
  readonly watchedAt: string;
  readonly progressSeconds: number;
  readonly totalSeconds: number;
}

export interface YouTubeVideoMeta {
  readonly title: string;
  readonly artist: string;
  readonly thumbnail: string;
  readonly duration: string;
}

// ─── YouTube helpers ──────────────────────────────────────────────────────────

const EDGE_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;

function parseISO8601Duration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  const h = parseInt(match[1] ?? '0', 10);
  const m = parseInt(match[2] ?? '0', 10);
  const s = parseInt(match[3] ?? '0', 10);
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

const ytThumb = (videoId: string) =>
  `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

export function useYouTubeVideoMeta(videoId: string) {
  return useQuery({
    queryKey: ['yt-video-meta', videoId],
    queryFn: async ({ signal }): Promise<YouTubeVideoMeta> => {
      const url = `${EDGE_BASE}/youtube/video?id=${encodeURIComponent(videoId)}`;
      const res = await fetch(url, {
        signal,
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      if (!res.ok) throw new Error(`YouTube API ${res.status}`);
      const data: {
        title?: string;
        channel?: string;
        thumbnail?: string;
        duration?: string;
      } = await res.json();
      return {
        title: data.title ?? 'Unknown Title',
        artist: data.channel ?? 'Unknown Artist',
        thumbnail: data.thumbnail ?? ytThumb(videoId),
        duration: data.duration ? parseISO8601Duration(data.duration) : '—',
      };
    },
    enabled: !!videoId && videoId.length >= 9,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function formatRelativeDate(isoDate: string): string {
  try {
    return formatDistanceToNow(new Date(isoDate), { addSuffix: true });
  } catch {
    return isoDate;
  }
}

export { ytThumb };

// ─── Types: Discovery ─────────────────────────────────────────────────────────

export interface DiscoveryArtist {
  readonly id: string;
  readonly name: string;
  readonly image: string;
  readonly genre: string;
  readonly origin: string;
  readonly hook: string;
}

// ─── KV store helpers (routed through the edge function to bypass RLS) ────────

const authHeaders = { Authorization: `Bearer ${publicAnonKey}` };

async function kvGet<T>(key: string): Promise<T | null> {
  const res = await fetch(`${EDGE_BASE}/kv/${encodeURIComponent(key)}`, { headers: authHeaders });
  if (!res.ok) throw new Error(`kvGet ${res.status}`);
  const json = await res.json();
  return (json.value as T) ?? null;
}

async function kvSet<T>(key: string, value: T): Promise<void> {
  const res = await fetch(`${EDGE_BASE}/kv/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`kvSet ${res.status}: ${err.error ?? 'unknown'}`);
  }
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

const SEED_PLAYLISTS: Playlist[] = [];

const SEED_FOLLOWING: FollowedArtist[] = [
  { id: 'a1', name: 'Elena Rivers', genre: 'Jazz', watchProgress: 72, deepDive: true, lastActive: hoursAgo(2), avatar: 'https://images.unsplash.com/photo-1733916609663-391d7598eb7c?q=80&w=400&auto=format&fit=crop' },
  { id: 'a2', name: 'Marcus Webb', genre: 'Soul', watchProgress: 45, deepDive: false, lastActive: daysAgo(1), avatar: 'https://images.unsplash.com/photo-1762160767032-9a639bc9f89e?q=80&w=400&auto=format&fit=crop' },
  { id: 'a3', name: 'Aria Chen', genre: 'Classical', watchProgress: 88, deepDive: true, lastActive: daysAgo(3), avatar: 'https://images.unsplash.com/photo-1765452041692-2ded8e24be06?q=80&w=400&auto=format&fit=crop' },
  { id: 'a4', name: 'The Nomads', genre: 'Indie Folk', watchProgress: 31, deepDive: false, lastActive: daysAgo(7), avatar: 'https://images.unsplash.com/photo-1760160741849-0809daa8e4c8?q=80&w=400&auto=format&fit=crop' },
];

// Real YouTube video IDs so metadata is fetched live from the API
const SEED_WATCH_LATER: WatchLaterVideo[] = [
  { id: 'wl1', videoId: 'JGwWNGJdvx8', addedAt: daysAgo(1) },  // Ed Sheeran - Shape of You
  { id: 'wl2', videoId: 'OPf0YbXqDm0', addedAt: daysAgo(3) },  // Uptown Funk
  { id: 'wl3', videoId: 'YQHsXMglC9A', addedAt: daysAgo(7) },  // Adele - Hello
  { id: 'wl4', videoId: 'kJQP7kiw5Fk', addedAt: daysAgo(14) }, // Despacito
];

const SEED_HISTORY: HistoryVideo[] = [
  { id: 'h1', videoId: '9bZkp7q19f0', watchedAt: hoursAgo(2),  progressSeconds: 162,  totalSeconds: 252  }, // Gangnam Style
  { id: 'h2', videoId: 'dQw4w9WgXcQ', watchedAt: daysAgo(1),   progressSeconds: 213,  totalSeconds: 213  }, // Never Gonna Give You Up
  { id: 'h3', videoId: 'CevxZvSJLk8', watchedAt: daysAgo(3),   progressSeconds: 120,  totalSeconds: 263  }, // Katy Perry - Roar
  { id: 'h4', videoId: 'OPf0YbXqDm0', watchedAt: daysAgo(4),   progressSeconds: 230,  totalSeconds: 230  }, // Uptown Funk (finished)
  { id: 'h5', videoId: 'RgKAFK5djSk', watchedAt: daysAgo(7),   progressSeconds: 150,  totalSeconds: 237  }, // See You Again
];

// ─── Hooks: Playlists ─────────────────────────────────────────────────────────

const PLAYLISTS_KEY = 'library:playlists:v3';

export function usePlaylists() {
  return useQuery({
    queryKey: ['library', 'playlists'],
    queryFn: async () => {
      const data = await kvGet<Playlist[]>(PLAYLISTS_KEY);
      if (data !== null) return data;
      await kvSet(PLAYLISTS_KEY, SEED_PLAYLISTS);
      return SEED_PLAYLISTS;
    },
    staleTime: 30_000,
  });
}

export function useCreatePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const current = await kvGet<Playlist[]>(PLAYLISTS_KEY) ?? [];
      const next: Playlist[] = [
        {
          id: `pl_${Date.now()}`,
          name,
          trackCount: 0,
          thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=400&auto=format&fit=crop',
          updatedAt: new Date().toISOString(),
        },
        ...current,
      ];
      await kvSet(PLAYLISTS_KEY, next);
      return next;
    },
    onSuccess: (next) => {
      qc.setQueryData(['library', 'playlists'], next);
    },
  });
}

export function useDeletePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const current = await kvGet<Playlist[]>(PLAYLISTS_KEY) ?? [];
      const next = current.filter((p) => p.id !== id);
      await kvSet(PLAYLISTS_KEY, next);
      return next;
    },
    onSuccess: (next) => {
      qc.setQueryData(['library', 'playlists'], next);
    },
  });
}

const PLAYLIST_VIDEOS_KEY = 'library:playlist-videos:v1';

export function useIsVideoInPlaylist(playlistId: string, videoId: string) {
  return useQuery({
    queryKey: ['library', 'playlist-videos', playlistId],
    queryFn: async () => {
      const all = await kvGet<Record<string, string[]>>(PLAYLIST_VIDEOS_KEY) ?? {};
      return all[playlistId] ?? [];
    },
    select: (ids) => ids.includes(videoId),
    staleTime: 30_000,
  });
}

export function useAddToPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ playlistId, videoId }: { playlistId: string; videoId: string }) => {
      const allVideos = await kvGet<Record<string, string[]>>(PLAYLIST_VIDEOS_KEY) ?? {};
      const current = allVideos[playlistId] ?? [];
      if (current.includes(videoId)) return null;
      allVideos[playlistId] = [videoId, ...current];
      await kvSet(PLAYLIST_VIDEOS_KEY, allVideos);

      const playlists = await kvGet<Playlist[]>(PLAYLISTS_KEY) ?? [];
      const updated = playlists.map((p) =>
        p.id === playlistId
          ? { ...p, trackCount: p.trackCount + 1, updatedAt: new Date().toISOString() }
          : p
      );
      await kvSet(PLAYLISTS_KEY, updated);
      return updated;
    },
    onSuccess: (updated) => {
      if (updated) qc.setQueryData(['library', 'playlists'], updated);
      qc.invalidateQueries({ queryKey: ['library', 'playlist-videos'] });
    },
  });
}

// ─── Hooks: Following ─────────────────────────────────────────────────────────

const FOLLOWING_KEY = 'library:following:v2';

export function useFollowing() {
  return useQuery({
    queryKey: ['library', 'following'],
    queryFn: async () => {
      const data = await kvGet<FollowedArtist[]>(FOLLOWING_KEY);
      if (data !== null) return data;
      await kvSet(FOLLOWING_KEY, SEED_FOLLOWING);
      return SEED_FOLLOWING;
    },
    staleTime: 30_000,
  });
}

export function useUnfollowArtist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const current = await kvGet<FollowedArtist[]>(FOLLOWING_KEY) ?? [];
      const next = current.filter((a) => a.id !== id);
      await kvSet(FOLLOWING_KEY, next);
      return next;
    },
    onSuccess: (next) => {
      qc.setQueryData(['library', 'following'], next);
    },
  });
}

export interface FollowArtistInput {
  id: string;
  name: string;
  avatar: string;
  genre: string;
}

async function createFollowNotifications(artist: FollowArtistInput, qc: ReturnType<typeof useQueryClient>): Promise<void> {
  // Upsert channel so notifications can join it
  await supabase.from('channels').upsert({
    id: artist.id,
    title: artist.name,
    thumbnail_url: artist.avatar,
  });

  // Search YouTube for the artist's latest videos
  const searchRes = await fetch(
    `${EDGE_BASE}/youtube/search?q=${encodeURIComponent(artist.name)}&maxResults=5`,
    { headers: { Authorization: `Bearer ${publicAnonKey}` } },
  );
  if (!searchRes.ok) return;
  const searchData = await searchRes.json();
  const videoIds: string[] = (searchData.videos ?? [])
    .map((v: { id: string }) => v.id)
    .filter(Boolean)
    .slice(0, 5);
  if (!videoIds.length) return;

  // Fetch full video details for thumbnail + title
  const detailsRes = await fetch(
    `${EDGE_BASE}/youtube/videos?ids=${videoIds.join(',')}`,
    { headers: { Authorization: `Bearer ${publicAnonKey}` } },
  );
  if (!detailsRes.ok) return;
  const detailsData = await detailsRes.json();

  for (const v of detailsData.videos ?? []) {
    if (!v.id) continue;
    await supabase.from('notifications').upsert({
      id: v.id,
      type: 'new-video',
      title: v.title ?? 'New Video',
      message: 'posted a new video',
      thumbnail_url: v.thumbnail ?? null,
      is_special: false,
      published_at: new Date().toISOString(),
      channel_id: artist.id,
    });
  }

  qc.invalidateQueries({ queryKey: ['notifications'] });
}

export function useFollowArtist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (artist: FollowArtistInput) => {
      const current = await kvGet<FollowedArtist[]>(FOLLOWING_KEY) ?? [];
      if (current.some((a) => a.id === artist.id)) return current;
      const newArtist: FollowedArtist = {
        id: artist.id,
        name: artist.name,
        avatar: artist.avatar,
        genre: artist.genre,
        watchProgress: 0,
        deepDive: false,
        lastActive: new Date().toISOString(),
      };
      const next = [newArtist, ...current];
      await kvSet(FOLLOWING_KEY, next);
      return next;
    },
    onSuccess: (next, artist) => {
      qc.setQueryData(['library', 'following'], next);
      createFollowNotifications(artist, qc).catch(() => {});
    },
  });
}

// ─── Hooks: Watch Later ───────────────────────────────────────────────────────

const WATCH_LATER_KEY = 'library:watch_later:v2';

export function useWatchLater() {
  return useQuery({
    queryKey: ['library', 'watchlater'],
    queryFn: async () => {
      const data = await kvGet<WatchLaterVideo[]>(WATCH_LATER_KEY);
      if (data !== null) return data;
      await kvSet(WATCH_LATER_KEY, SEED_WATCH_LATER);
      return SEED_WATCH_LATER;
    },
    staleTime: 30_000,
  });
}

export function useRemoveFromWatchLater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const current = await kvGet<WatchLaterVideo[]>(WATCH_LATER_KEY) ?? [];
      const next = current.filter((v) => v.id !== id);
      await kvSet(WATCH_LATER_KEY, next);
      return next;
    },
    onSuccess: (next) => {
      qc.setQueryData(['library', 'watchlater'], next);
    },
  });
}

// ─── Hooks: Watch History ─────────────────────────────────────────────────────

const HISTORY_KEY = 'library:history:v2';

export function useWatchHistory() {
  const userId = useAuthedUserId();
  const userKey = `${HISTORY_KEY}:${userId}`;
  return useQuery({
    queryKey: ['library', 'history', userId],
    queryFn: async () => {
      const data = await kvGet<HistoryVideo[]>(userKey);
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useRemoveFromHistory() {
  const qc = useQueryClient();
  const userId = useAuthedUserId();
  const userKey = `${HISTORY_KEY}:${userId}`;
  return useMutation({
    mutationFn: async (id: string) => {
      const current = await kvGet<HistoryVideo[]>(userKey) ?? [];
      const next = current.filter((v) => v.id !== id);
      await kvSet(userKey, next);
      return next;
    },
    onSuccess: (next) => {
      qc.setQueryData(['library', 'history', userId], next);
    },
  });
}

export function useClearHistory() {
  const qc = useQueryClient();
  const userId = useAuthedUserId();
  const userKey = `${HISTORY_KEY}:${userId}`;
  return useMutation({
    mutationFn: async () => {
      await kvSet<HistoryVideo[]>(userKey, []);
    },
    onSuccess: () => {
      qc.setQueryData(['library', 'history', userId], []);
    },
  });
}

// ─── Hooks: Liked Videos ──────────────────────────────────────────────────────

export interface LikedVideo {
  readonly id: string;
  readonly videoId: string;
  readonly likedAt: string;
}

const LIKED_KEY = 'library:liked:v2';

export function useLikedVideos() {
  const userId = useAuthedUserId();
  const userKey = `${LIKED_KEY}:${userId}`;
  return useQuery({
    queryKey: ['library', 'liked', userId],
    queryFn: async () => {
      const data = await kvGet<LikedVideo[]>(userKey);
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useIsVideoLiked(videoId: string) {
  const { data: liked = [] } = useLikedVideos();
  return liked.some((v) => v.videoId === videoId);
}

export function useToggleLikedVideo() {
  const qc = useQueryClient();
  const userId = useAuthedUserId();
  const userKey = `${LIKED_KEY}:${userId}`;
  return useMutation({
    mutationFn: async (videoId: string) => {
      const current = await kvGet<LikedVideo[]>(userKey) ?? [];
      const isLiked = current.some((v) => v.videoId === videoId);
      const next: LikedVideo[] = isLiked
        ? current.filter((v) => v.videoId !== videoId)
        : [{ id: videoId, videoId, likedAt: new Date().toISOString() }, ...current];
      await kvSet(userKey, next);
      return next;
    },
    onSuccess: (next) => {
      qc.setQueryData(['library', 'liked', userId], next);
    },
  });
}

// ─── Hooks: Discovery Artists ─────────────────────────────────────────────────

const DISCOVERY_ARTISTS_KEY = 'explore:discovery_artists:v1';

const SEED_DISCOVERY_ARTISTS: DiscoveryArtist[] = [
  { id: 'UCmD8TDgJxofPfxA8GTpaCCQ', name: 'Hiatus Kaiyote', image: 'https://images.unsplash.com/photo-1692552951556-dd9072f30c14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGFzc2ljYWwlMjBwaWFuaXN0JTIwcGVyZm9ybWFuY2V8ZW58MXx8fHwxNzcyMDY3NDEyfDA&ixlib=rb-4.1.0&q=80&w=1080', genre: 'Neo-Soul', origin: 'Melbourne, Australia', hook: 'Polyrhythmic neo-soul that defies genre boundaries' },
  { id: 'UC3-Y8IfhCgjIUNwDySbhQiA', name: 'Arooj Aftab', image: 'https://images.unsplash.com/photo-1595963202332-e837eb8e466c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXAlMjBob3AlMjByYXBwZXIlMjBzdHVkaW98ZW58MXx8fHwxNzcyMDU1Nzk5fDA&ixlib=rb-4.1.0&q=80&w=1080', genre: 'World', origin: 'Lahore, Pakistan', hook: 'Ancient Sufi poetry reimagined through jazz and electronica' },
  { id: 'UCZGBua-dvwfSdcF9AskDIgw', name: 'Khruangbin', image: 'https://images.unsplash.com/photo-1765452041692-2ded8e24be06?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaW5nZXIlMjBzb3VsJTIwYXJ0aXN0JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzcyMDY3NDExfDA&ixlib=rb-4.1.0&q=80&w=1080', genre: 'Indie', origin: 'Houston, USA', hook: 'Global bass music blending Thai funk, soul and dub' },
  { id: 'UC5NbPNPbdLwAPPwWTJw0EbQ', name: 'Floating Points', image: 'https://images.unsplash.com/photo-1712530967389-e4b5b16b8500?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljJTIwbXVzaWMlMjBwcm9kdWNlcnxlbnwxfHx8fDE3NzE5NDczNzZ8MA&ixlib=rb-4.1.0&q=80&w=1080', genre: 'Electronic', origin: 'Manchester, UK', hook: 'Jazz-influenced electronic music with orchestral depth' },
  { id: 'UCBJtGODWGrM3fdQ0G5E9uAQ', name: 'Norah Jones', image: 'https://images.unsplash.com/photo-1760160741849-0809daa8e4c8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpZSUyMGZvbGslMjBtdXNpY2lhbnxlbnwxfHx8fDE3NzIwNjc0MTF8MA&ixlib=rb-4.1.0&q=80&w=1080', genre: 'Jazz', origin: 'New York, USA', hook: 'Velvet-voiced jazz and country crossover icon' },
  { id: 'UCW2SLxltqPa553qretr4KzQ', name: 'Khruangbin', image: 'https://images.unsplash.com/photo-1764112781095-24e1bf17eec9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGFydGlzdCUyMG1vbm9jaHJvbWUlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzIwNjYzODF8MA&ixlib=rb-4.1.0&q=80&w=1080', genre: 'World', origin: 'Houston, USA', hook: 'Transcendent global bass melodies across continents' },
];

export function useDiscoveryArtists() {
  return useQuery({
    queryKey: ['explore', 'discovery-artists'],
    queryFn: async () => {
      const data = await kvGet<DiscoveryArtist[]>(DISCOVERY_ARTISTS_KEY);
      if (data !== null) return data;
      await kvSet(DISCOVERY_ARTISTS_KEY, SEED_DISCOVERY_ARTISTS);
      return SEED_DISCOVERY_ARTISTS;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
