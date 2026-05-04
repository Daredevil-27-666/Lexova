import { useQuery } from '@tanstack/react-query';

export interface Album {
  id: string;
  title: string;
  year: string;
  type: string;
  coverUrl: string | null;
  trackCount: number;
}

const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_ID_RE = /^[\w-]{20,50}$/;

function uploadsPlaylistId(channelId: string): string {
  // Official uploads playlist for a channel UC… → UU… (same suffix).
  if (channelId.startsWith('UC') && channelId.length >= 3) {
    return `UU${channelId.slice(2)}`;
  }
  return '';
}

function mapPlaylistItem(item: {
  id: string;
  snippet?: {
    title?: string;
    publishedAt?: string;
    thumbnails?: {
      default?: { url?: string };
      medium?: { url?: string };
      high?: { url?: string };
      standard?: { url?: string };
    };
  };
  contentDetails?: { itemCount?: number };
}): Album {
  const thumbs = item.snippet?.thumbnails;
  const coverUrl =
    thumbs?.high?.url ??
    thumbs?.medium?.url ??
    thumbs?.standard?.url ??
    thumbs?.default?.url ??
    null;
  const published = item.snippet?.publishedAt ?? '';
  const year = published ? String(new Date(published).getFullYear()) : '—';

  return {
    id: item.id,
    title: item.snippet?.title?.trim() || 'Untitled',
    year,
    type: 'Playlist',
    coverUrl,
    trackCount: item.contentDetails?.itemCount ?? 0,
  };
}

async function fetchPlaylistPage(
  url: URL,
  signal?: AbortSignal,
): Promise<{ items: Album[]; nextPageToken?: string }> {
  const res = await fetch(url.toString(), { signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message ?? `YouTube API error (${res.status})`;
    throw new Error(msg);
  }

  const items = (data.items ?? []).map(mapPlaylistItem);
  return { items, nextPageToken: data.nextPageToken };
}

/** Channel playlists (excluding the auto-generated “uploads” list). */
async function fetchChannelPlaylists(
  channelId: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<Album[]> {
  const skipId = uploadsPlaylistId(channelId);
  const out: Album[] = [];
  let pageToken: string | undefined;
  const maxPages = 4;

  for (let p = 0; p < maxPages; p++) {
    const url = new URL(`${YOUTUBE_BASE}/playlists`);
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('channelId', channelId);
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('key', apiKey);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const { items, nextPageToken } = await fetchPlaylistPage(url, signal);
    for (const album of items) {
      if (skipId && album.id === skipId) continue;
      out.push(album);
    }
    pageToken = nextPageToken;
    if (!pageToken) break;
  }

  return out;
}

/** Fallback: playlist search when the channel publishes few/no playlists. */
async function searchPlaylistsForArtist(
  artistName: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<Album[]> {
  const url = new URL(`${YOUTUBE_BASE}/search`);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'playlist');
  url.searchParams.set('q', `${artistName} album`);
  url.searchParams.set('maxResults', '25');
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString(), { signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message ?? `YouTube search error (${res.status})`;
    throw new Error(msg);
  }

  const ids = (data.items ?? [])
    .map((it: { id?: { playlistId?: string } }) => it.id?.playlistId)
    .filter(Boolean) as string[];
  if (ids.length === 0) return [];

  const detailUrl = new URL(`${YOUTUBE_BASE}/playlists`);
  detailUrl.searchParams.set('part', 'snippet,contentDetails');
  detailUrl.searchParams.set('id', ids.join(','));
  detailUrl.searchParams.set('maxResults', '50');
  detailUrl.searchParams.set('key', apiKey);

  const { items } = await fetchPlaylistPage(detailUrl, signal);
  return items;
}

async function fetchDiscography(
  channelId: string,
  artistName: string,
  signal?: AbortSignal,
): Promise<Album[]> {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
  if (!apiKey) throw new Error('YouTube API key is not configured (VITE_YOUTUBE_API_KEY).');

  let albums = await fetchChannelPlaylists(channelId, apiKey, signal);

  if (albums.length === 0 && artistName.trim()) {
    albums = await searchPlaylistsForArtist(artistName.trim(), apiKey, signal);
  }

  albums.sort((a, b) => {
    const ya = parseInt(a.year, 10);
    const yb = parseInt(b.year, 10);
    if (!Number.isNaN(ya) && !Number.isNaN(yb) && ya !== yb) return yb - ya;
    return a.title.localeCompare(b.title);
  });

  return albums;
}

export function useDiscography(channelId: string, artistName: string) {
  const cid = channelId.trim();
  const name = artistName.trim();
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;

  return useQuery({
    queryKey: ['discography', 'youtube', cid.toLowerCase()],
    queryFn: ({ signal }) => fetchDiscography(cid, name, signal),
    enabled: !!cid && !!apiKey && YOUTUBE_ID_RE.test(cid),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
