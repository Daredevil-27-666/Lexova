import { useQuery } from '@tanstack/react-query';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  channelName: string;
  views: number;
  uploadDate: string;
  likes: number;
  hasUserLiked?: boolean;
  channelId?: string;
}

const fetchVideoData = async (videoId: string, signal?: AbortSignal): Promise<VideoInfo> => {
  const url = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff/youtube/video?id=${encodeURIComponent(videoId)}`;

  const res = await fetch(url, {
    signal,
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? `Failed to fetch video (${res.status})`);
  }

  const data = await res.json();

  return {
    id: data.id,
    title: data.title,
    description: data.description ?? '',
    channelName: data.channel ?? '',
    views: parseInt(data.viewCount ?? '0', 10),
    uploadDate: data.publishedAt,
    likes: parseInt(data.likeCount ?? '0', 10),
    hasUserLiked: false,
    channelId: data.channelId,
  };
};

export function useVideoDetails(videoId: string) {
  return useQuery({
    queryKey: ['video', videoId],
    queryFn: ({ signal }) => fetchVideoData(videoId, signal),
    enabled: !!videoId,
    staleTime: 1000 * 60 * 5,  // 5 min — video stats don't change by the second
    retry: 1,
  });
}
