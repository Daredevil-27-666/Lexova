import { useState } from 'react';
import {
  ListMusic, Users, Heart, History,
  Play, MoreHorizontal, Plus, Trash2,
  ChevronRight, BookOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import {
  usePlaylists, useCreatePlaylist, useDeletePlaylist,
  useFollowing, useUnfollowArtist,
  useLikedVideos, useToggleLikedVideo,
  useWatchHistory, useRemoveFromHistory, useClearHistory,
  useYouTubeVideoMeta,
  formatRelativeDate, ytThumb,
  type LikedVideo,
  type HistoryVideo,
} from '../components/hooks/useLibraryData';

// ─── Types ────────────────────────────────────────────────────────────────────

type LibraryTab = 'playlists' | 'following' | 'likedsongs' | 'history';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const progressPct = (s: number, total: number) =>
  total > 0 ? Math.round((s / total) * 100) : 0;

// ─── Skeletons ────────────────────────────────────────────────────────────────

function VideoRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl animate-pulse">
      <div className="w-36 h-[81px] rounded-lg flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-4 rounded w-2/3" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <div className="h-3 rounded w-1/3" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <div className="h-3 rounded w-1/4" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
      </div>
    </div>
  );
}

function PlaylistSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="rounded-xl mb-3" style={{ aspectRatio: '16/9', backgroundColor: 'rgba(255,255,255,0.08)' }} />
      <div className="h-4 rounded w-3/4 mb-1" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
      <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="font-['DM_Sans'] text-sm text-center py-12" style={{ color: 'var(--text-secondary)' }}>
      {message}
    </p>
  );
}

// ─── YouTube-enriched video rows ──────────────────────────────────────────────

function LikedSongRow({
  video,
  onUnlike,
  navigate,
}: {
  video: LikedVideo;
  onUnlike: () => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { data: yt, isLoading } = useYouTubeVideoMeta(video.videoId);

  const title = yt?.title ?? '—';
  const artist = yt?.artist ?? '—';
  const thumbnail = yt?.thumbnail ?? ytThumb(video.videoId);
  const duration = yt?.duration ?? '—';

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-xl group cursor-pointer transition-colors hover:bg-white/5"
      onClick={() => navigate(`/watch/${video.videoId}`)}
    >
      <div className="relative w-36 h-[81px] rounded-lg overflow-hidden flex-shrink-0">
        <ImageWithFallback
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <Play className="w-5 h-5 text-white fill-current" />
        </div>
        <span
          className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded font-['DM_Sans'] text-[10px] font-semibold"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', color: '#fff' }}
        >
          {duration}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="space-y-1.5 animate-pulse">
            <div className="h-4 rounded w-3/4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
          </div>
        ) : (
          <>
            <p className="font-['DM_Sans'] font-semibold mb-1 truncate" style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
              {title}
            </p>
            <p className="font-['DM_Sans'] text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              {artist}
            </p>
            <p className="font-['DM_Sans'] text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
              Liked {formatRelativeDate(video.likedAt)}
            </p>
          </>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onUnlike(); }}
        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 flex-shrink-0"
        style={{ color: 'var(--gold-accent)' }}
        title="Unlike"
      >
        <Heart className="w-4 h-4 fill-current" />
      </button>
    </div>
  );
}

function HistoryRow({
  video,
  onRemove,
  navigate,
}: {
  video: HistoryVideo;
  onRemove: () => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { data: yt, isLoading } = useYouTubeVideoMeta(video.videoId);

  const title = yt?.title ?? '—';
  const artist = yt?.artist ?? '—';
  const thumbnail = yt?.thumbnail ?? ytThumb(video.videoId);
  const duration = yt?.duration ?? '—';
  const pct = progressPct(video.progressSeconds, video.totalSeconds);
  const finished = pct >= 98;

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-xl group cursor-pointer transition-colors hover:bg-white/5"
      onClick={() => navigate(`/watch/${video.videoId}`)}
    >
      <div className="relative w-36 h-[81px] rounded-lg overflow-hidden flex-shrink-0">
        <ImageWithFallback
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          style={{ opacity: finished ? 0.55 : 1 }}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <Play className="w-5 h-5 text-white fill-current" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="h-full"
            style={{ width: `${pct}%`, backgroundColor: finished ? 'rgba(255,255,255,0.4)' : 'var(--gold-accent)' }}
          />
        </div>
        <span
          className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded font-['DM_Sans'] text-[10px] font-semibold"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', color: '#fff' }}
        >
          {duration}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="space-y-1.5 animate-pulse">
            <div className="h-4 rounded w-3/4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
          </div>
        ) : (
          <>
            <p
              className="font-['DM_Sans'] font-semibold mb-1 truncate"
              style={{ color: finished ? 'var(--text-secondary)' : 'var(--text-primary)', fontSize: '0.9375rem' }}
            >
              {title}
            </p>
            <p className="font-['DM_Sans'] text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              {artist}
            </p>
            <p className="font-['DM_Sans'] text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
              {finished ? 'Watched' : `${pct}% watched`} · {formatRelativeDate(video.watchedAt)}
            </p>
          </>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 flex-shrink-0"
        style={{ color: 'var(--text-secondary)' }}
        title="Remove from history"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Sub-panels ───────────────────────────────────────────────────────────────

function PlaylistsPanel({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { data: playlists = [], isLoading } = usePlaylists();
  const { mutate: createPlaylist } = useCreatePlaylist();
  const { mutate: deletePlaylist } = useDeletePlaylist();

  const handleNewPlaylist = () => {
    const name = window.prompt('Playlist name');
    if (name?.trim()) createPlaylist(name.trim());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="font-['DM_Sans'] text-sm" style={{ color: 'var(--text-secondary)' }}>
          {isLoading ? '—' : `${playlists.length} playlists`}
        </p>
        <button
          onClick={handleNewPlaylist}
          className="flex items-center gap-2 px-4 py-2 rounded-full font-['DM_Sans'] text-sm font-semibold transition-all hover:scale-105"
          style={{ backgroundColor: 'var(--gold-accent)', color: '#0D0D0D' }}
        >
          <Plus className="w-4 h-4" />
          New Playlist
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <PlaylistSkeleton key={i} />)}
        </div>
      ) : playlists.length === 0 ? (
        <EmptyState message="No playlists yet. Create your first one." />
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => navigate(`/playlist/${pl.id}`)}
              className="group cursor-pointer"
            >
              <div className="relative rounded-xl overflow-hidden mb-3" style={{ aspectRatio: '16/9' }}>
                <ImageWithFallback
                  src={pl.thumbnail}
                  alt={pl.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: 'var(--gold-accent)' }}
                  >
                    <Play className="w-6 h-6 fill-current ml-0.5" style={{ color: '#0D0D0D' }} />
                  </div>
                </div>
                <div
                  className="absolute bottom-2 left-2 px-2 py-0.5 rounded font-['DM_Sans'] text-[11px] font-semibold"
                  style={{ backgroundColor: 'rgba(0,0,0,0.8)', color: '#fff' }}
                >
                  {pl.trackCount} videos
                </div>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p
                    className="font-['DM_Sans'] font-semibold truncate group-hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {pl.name}
                  </p>
                  <p className="font-['DM_Sans'] text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Updated {formatRelativeDate(pl.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deletePlaylist(pl.id); }}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Delete playlist"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FollowingPanel({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { data: following = [], isLoading } = useFollowing();
  const { mutate: unfollow } = useUnfollowArtist();

  return (
    <div>
      <p className="font-['DM_Sans'] text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        {isLoading ? '—' : `${following.length} artists`}
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-5 p-4 rounded-xl animate-pulse">
              <div className="w-14 h-14 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <div className="flex-1 space-y-2">
                <div className="h-4 rounded w-1/3" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <div className="h-3 rounded w-1/4" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                <div className="h-1 rounded w-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : following.length === 0 ? (
        <EmptyState message="You're not following any artists yet." />
      ) : (
        <div className="space-y-3">
          {following.map((artist) => (
            <div
              key={artist.id}
              onClick={() => navigate(`/artist/${artist.id}`)}
              className="flex items-center gap-5 p-4 rounded-xl cursor-pointer group transition-colors hover:bg-white/5"
            >
              <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                <ImageWithFallback
                  src={artist.avatar}
                  alt={artist.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p
                    className="font-['DM_Sans'] font-semibold group-hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {artist.name}
                  </p>
                  {artist.deepDive && (
                    <span
                      className="px-2 py-0.5 rounded-full font-['DM_Sans'] text-[10px] font-semibold flex items-center gap-1"
                      style={{ backgroundColor: 'rgba(201,169,110,0.15)', color: 'var(--gold-accent)', border: '1px solid rgba(201,169,110,0.3)' }}
                    >
                      <BookOpen className="w-2.5 h-2.5" /> Deep Dive
                    </span>
                  )}
                </div>
                <p className="font-['DM_Sans'] text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {artist.genre} · Active {formatRelativeDate(artist.lastActive)}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${artist.watchProgress}%`, backgroundColor: 'var(--gold-accent)' }}
                    />
                  </div>
                  <span className="font-['DM_Sans'] text-[11px] tabular-nums flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    {artist.watchProgress}% explored
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); unfollow(artist.id); }}
                className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 flex-shrink-0"
                style={{ color: 'var(--text-secondary)' }}
                title="Unfollow"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-secondary)' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LikedSongsPanel({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { data: videos = [], isLoading } = useLikedVideos();
  const { mutate: toggleLike } = useToggleLikedVideo();

  return (
    <div>
      <p className="font-['DM_Sans'] text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        {isLoading ? '—' : `${videos.length} liked songs`}
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <VideoRowSkeleton key={i} />)}
        </div>
      ) : videos.length === 0 ? (
        <EmptyState message="No liked songs yet." />
      ) : (
        <div className="space-y-3">
          {videos.map((video) => (
            <LikedSongRow
              key={video.id}
              video={video}
              onUnlike={() => toggleLike(video.videoId)}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryPanel({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { data: history = [], isLoading } = useWatchHistory();
  const { mutate: removeVideo } = useRemoveFromHistory();
  const { mutate: clearHistory } = useClearHistory();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="font-['DM_Sans'] text-sm" style={{ color: 'var(--text-secondary)' }}>
          {isLoading ? '—' : `${history.length} videos watched`}
        </p>
        {history.length > 0 && (
          <button
            onClick={() => clearHistory()}
            className="font-['DM_Sans'] text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-secondary)' }}
          >
            Clear history
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <VideoRowSkeleton key={i} />)}
        </div>
      ) : history.length === 0 ? (
        <EmptyState message="No watch history yet." />
      ) : (
        <div className="space-y-3">
          {history.map((video) => (
            <HistoryRow
              key={video.id}
              video={video}
              onRemove={() => removeVideo(video.id)}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Library() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LibraryTab>('playlists');

  const { data: playlists = [] } = usePlaylists();
  const { data: following = [] } = useFollowing();
  const { data: likedSongs = [] } = useLikedVideos();
  const { data: history = [] } = useWatchHistory();

  const TABS: { id: LibraryTab; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'playlists',  label: 'Playlists',    icon: ListMusic, count: playlists.length  },
    { id: 'following',  label: 'Following',    icon: Users,     count: following.length  },
    { id: 'likedsongs', label: 'Liked Songs',  icon: Heart,     count: likedSongs.length },
    { id: 'history',    label: 'History',      icon: History,   count: history.length    },
  ];

  return (
    <div className="pb-16">
      <div className="px-6 pt-2 pb-8">
        <h1
          className="font-['Playfair_Display'] mb-1"
          style={{ color: 'var(--text-primary)', fontSize: '2.5rem', fontWeight: 600 }}
        >
          Your Library
        </h1>
        <p className="font-['DM_Sans']" style={{ color: 'var(--text-secondary)' }}>
          Playlists, artists you follow, saved videos, and watch history.
        </p>
      </div>

      <div
        className="sticky top-0 z-40 border-b px-6"
        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-1">
          {TABS.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-2 px-5 py-4 font-['DM_Sans'] text-sm font-medium transition-colors relative"
              style={{ color: activeTab === id ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              <Icon className="w-4 h-4" />
              {label}
              <span
                className="px-1.5 py-0.5 rounded-full font-['DM_Sans'] text-[10px] font-semibold"
                style={{
                  backgroundColor: activeTab === id ? 'var(--gold-accent)' : 'rgba(255,255,255,0.1)',
                  color: activeTab === id ? '#0D0D0D' : 'var(--text-secondary)',
                }}
              >
                {count}
              </span>
              {activeTab === id && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t"
                  style={{ backgroundColor: 'var(--gold-accent)' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pt-8">
        {activeTab === 'playlists'  && <PlaylistsPanel  navigate={navigate} />}
        {activeTab === 'following'  && <FollowingPanel  navigate={navigate} />}
        {activeTab === 'likedsongs' && <LikedSongsPanel navigate={navigate} />}
        {activeTab === 'history'    && <HistoryPanel    navigate={navigate} />}
      </div>
    </div>
  );
}
