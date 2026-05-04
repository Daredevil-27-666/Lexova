// components/DiscographyTab.tsx
import { ChevronLeft, ChevronRight, Loader2, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useDiscography } from '../hooks/useDiscography';

const YOUTUBE_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string;

// Deterministic color from album ID — keeps color out of the data model
const getAlbumColor = (id: string): string => {
  const palette = ['#2d4a3e', '#4a2d3e', '#2d3e4a', '#4a3e2d', '#3e2d4a'];
  const index =
    id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    palette.length;
  return palette[index];
};

interface DiscographyTabProps {
  /** YouTube channel ID (e.g. UC…). */
  channelId?: string;
  /** Display / search name for fallbacks. */
  artistName?: string;
}

const ARROW_SCROLL_PX = 300;

export function DiscographyTab({ channelId = '', artistName = '' }: DiscographyTabProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const { data: albums, isLoading, isError, error } = useDiscography(channelId, artistName);

  const handlePlay = useCallback(async (albumId: string, albumTitle: string) => {
    if (playingId) return;
    setPlayingId(albumId);
    try {
      const itemsParams = new URLSearchParams({
        part: 'contentDetails',
        playlistId: albumId,
        maxResults: '1',
        key: YOUTUBE_KEY,
      });
      const itemsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?${itemsParams}`,
      );
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        const videoId = itemsData.items?.[0]?.contentDetails?.videoId as string | undefined;
        if (videoId) {
          navigate(`/watch/${videoId}`);
          return;
        }
      }

      const searchParams = new URLSearchParams({
        part: 'snippet',
        q: `${artistName} ${albumTitle} full album`,
        type: 'video',
        maxResults: '1',
        key: YOUTUBE_KEY,
      });
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`);
      if (!res.ok) return;
      const data = await res.json();
      const videoId = data.items?.[0]?.id?.videoId;
      if (videoId) navigate(`/watch/${videoId}`);
    } catch {
      // silently fail — user stays on page
    } finally {
      setPlayingId(null);
    }
  }, [artistName, navigate, playingId]);

  // Update scroll button states whenever scroll position changes
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [albums, updateScrollState]);

  const scroll = useCallback((direction: 'left' | 'right') => {
    scrollRef.current?.scrollBy({
      left: direction === 'left' ? -ARROW_SCROLL_PX : ARROW_SCROLL_PX,
      behavior: 'smooth',
    });
  }, []);

  if (isLoading) {
    return (
      <div
        className="flex justify-center items-center h-64"
        style={{ color: 'var(--text-secondary)' }}
      >
        Loading discography...
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="p-4 rounded-lg text-red-400"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      >
        {error instanceof Error ? error.message : 'Failed to load albums.'}
      </div>
    );
  }

  if (!albums || albums.length === 0) {
    return (
      <div className="text-center p-8" style={{ color: 'var(--text-secondary)' }}>
        No albums found for this artist.
      </div>
    );
  }

  return (
    <div>
      <h3
        className="font-['Playfair_Display'] text-xl font-semibold mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        Complete Discography
      </h3>

      <div className="flex items-center justify-end gap-2 mb-3">
        <button
          type="button"
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          aria-label="Scroll left"
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          aria-label="Scroll right"
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {albums.map((album) => (
          <div
            key={album.id}
            onClick={() => handlePlay(album.id, album.title)}
            className="flex-shrink-0 w-52 rounded-lg overflow-hidden group cursor-pointer transition-all hover:scale-105"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <div
              className="w-full aspect-square relative overflow-hidden"
              style={{
                backgroundColor: album.coverUrl
                  ? undefined
                  : getAlbumColor(album.id),
              }}
            >
              {album.coverUrl && (
                <img
                  src={album.coverUrl}
                  alt={`${album.title} cover`}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--gold-accent)' }}
                >
                  {playingId === album.id ? (
                    <Loader2
                      className="w-5 h-5 animate-spin"
                      style={{ color: 'var(--bg-primary)' }}
                    />
                  ) : (
                    <Play
                      className="w-5 h-5 ml-0.5"
                      style={{ color: 'var(--bg-primary)' }}
                      fill="currentColor"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="p-4">
              <h4
                className="font-['Playfair_Display'] text-base font-semibold mb-1 line-clamp-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {album.title}
              </h4>
              <div
                className="font-['DM_Sans'] text-sm mb-1 flex items-center gap-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span>{album.year}</span>
                <span>•</span>
                <span>{album.type}</span>
              </div>
              {album.trackCount > 0 && (
                <div
                  className="font-['DM_Sans'] text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {album.trackCount} {album.trackCount === 1 ? 'track' : 'tracks'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}