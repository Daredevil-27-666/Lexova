import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router';
import { Clock, Eye } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { useVideoDetails } from './hooks/useVideoDetails';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecommendedVideo {
  id: string;
  thumbnailUrl: string;
  title: string;
  channelName: string;
  viewCount: number;
  durationSeconds: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const formatViews = (n: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
};

const parseISODuration = (iso: string): number => {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (
    parseInt(match[1] ?? '0', 10) * 3600 +
    parseInt(match[2] ?? '0', 10) * 60 +
    parseInt(match[3] ?? '0', 10)
  );
};

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const base = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;
const headers = { Authorization: `Bearer ${publicAnonKey}` };

const fetchArtistVideos = async (
  artistName: string,
  currentVideoId: string,
  signal?: AbortSignal,
): Promise<RecommendedVideo[]> => {
  // Step 1 — search YouTube for this artist's music videos
  const searchRes = await fetch(
    `${base}/youtube/search?q=${encodeURIComponent(artistName)}&maxResults=12`,
    { signal, headers },
  );
  if (!searchRes.ok) throw new Error(`Search failed: ${searchRes.status}`);
  const searchData = await searchRes.json();

  const videoIds: string[] = (searchData.videos ?? [])
    .map((v: { id: string }) => v.id)
    .filter((id: string) => Boolean(id) && id !== currentVideoId)
    .slice(0, 10);

  if (videoIds.length === 0) return [];

  // Step 2 — fetch full details (duration + view count) for those IDs
  const detailsRes = await fetch(
    `${base}/youtube/videos?ids=${videoIds.join(',')}`,
    { signal, headers },
  );
  if (!detailsRes.ok) throw new Error(`Details failed: ${detailsRes.status}`);
  const detailsData = await detailsRes.json();

  return (detailsData.videos ?? []).map((v: {
    id: string;
    title: string;
    channel: string;
    thumbnail: string;
    viewCount: string;
    duration: string;
  }) => ({
    id: v.id,
    thumbnailUrl: v.thumbnail ?? '',
    title: v.title ?? '',
    channelName: v.channel ?? '',
    viewCount: parseInt(v.viewCount ?? '0', 10),
    durationSeconds: parseISODuration(v.duration ?? ''),
  }));
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRecommendations(artistName: string, currentVideoId: string) {
  return useQuery({
    queryKey: ['recommendations', artistName, currentVideoId],
    queryFn: ({ signal }) => fetchArtistVideos(artistName, currentVideoId, signal),
    enabled: !!artistName && !!currentVideoId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecommendationsSidebar() {
  const { id: currentVideoId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Reuses the cached video details — no extra network call
  const { data: videoData } = useVideoDetails(currentVideoId);
  const artistName = videoData?.channelName ?? '';

  const { data: videos = [], isLoading } = useRecommendations(artistName, currentVideoId);

  const showSkeleton = !artistName || isLoading;

  return (
    <aside className="flex flex-col gap-4">
      <h3
        className="font-['DM_Sans'] text-sm font-semibold tracking-wider uppercase"
        style={{ color: 'var(--text-secondary)' }}
      >
        More from {artistName || '…'}
      </h3>

      {showSkeleton ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-40 h-[90px] rounded-md flex-shrink-0" style={{ backgroundColor: 'var(--bg-panel)' }} />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 rounded w-full" style={{ backgroundColor: 'var(--bg-panel)' }} />
                <div className="h-3 rounded w-3/4" style={{ backgroundColor: 'var(--bg-panel)' }} />
                <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--bg-panel)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <p className="font-['DM_Sans'] text-sm" style={{ color: 'var(--text-secondary)' }}>
          No suggestions found.
        </p>
      ) : (
        <div className="space-y-4">
          {videos.map((video) => (
            <button
              key={video.id}
              onClick={() => navigate(`/watch/${video.id}`)}
              className="flex gap-3 w-full text-left group rounded-lg transition-colors hover:bg-white/5 p-1 -m-1"
            >
              <div className="relative flex-shrink-0 w-40 h-[90px] rounded-md overflow-hidden">
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span
                  className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-['DM_Sans'] font-semibold"
                  style={{ backgroundColor: 'rgba(0,0,0,0.8)', color: '#fff' }}
                >
                  <Clock className="inline w-2.5 h-2.5 mr-0.5 -mt-px" />
                  {formatDuration(video.durationSeconds)}
                </span>
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <p
                  className="font-['DM_Sans'] text-sm font-medium leading-snug line-clamp-2 mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {video.title}
                </p>
                <p className="font-['DM_Sans'] text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {video.channelName}
                </p>
                <p className="font-['DM_Sans'] text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                  <Eye className="w-3 h-3" />
                  {formatViews(video.viewCount)} views
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
