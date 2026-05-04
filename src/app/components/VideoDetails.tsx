import { useState } from 'react';
import { Heart, Share2, ListPlus, Plus, Check } from 'lucide-react';
import { useParams } from 'react-router';
import { useVideoDetails } from './hooks/useVideoDetails';
import {
  useIsVideoLiked,
  useToggleLikedVideo,
  usePlaylists,
  useAddToPlaylist,
  useCreatePlaylist,
} from './hooks/useLibraryData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

export function VideoDetails() {
  const { id: videoId = '' } = useParams<{ id: string }>();
  const { data: video, isLoading, isError } = useVideoDetails(videoId);

  const isLiked = useIsVideoLiked(videoId);
  const { mutate: toggleLike, isPending: likeLoading } = useToggleLikedVideo();

  const { data: playlists = [] } = usePlaylists();
  const { mutate: addToPlaylist, isPending: addPending } = useAddToPlaylist();
  const { mutate: createPlaylist, isPending: createPending } = useCreatePlaylist();
  const [newName, setNewName] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [playlistOpen, setPlaylistOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="py-5 animate-pulse">
        <div className="h-8 bg-[#1a1a1a] rounded w-3/4 mb-4" />
        <div className="flex justify-between items-center">
          <div className="h-4 bg-[#1a1a1a] rounded w-1/3" />
          <div className="flex gap-2">
            <div className="h-10 bg-[#1a1a1a] rounded-full w-24" />
            <div className="h-10 bg-[#1a1a1a] rounded-full w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !video) {
    return (
      <div className="py-5 text-red-500 text-sm">Failed to load video details.</div>
    );
  }

  const formattedViews = new Intl.NumberFormat('en-US').format(video.views);
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(video.uploadDate));

  const handleLikeToggle = () => {
    if (likeLoading) return;
    toggleLike(videoId);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, url: `${window.location.origin}/watch/${video.id}` });
      } else {
        navigator.clipboard.writeText(`${window.location.origin}/watch/${video.id}`);
      }
    } catch (err) {
      console.log('Error sharing', err);
    }
  };

  const handleAdd = (playlistId: string) => {
    addToPlaylist({ playlistId, videoId }, {
      onSuccess: () => setAddedIds((prev) => new Set(prev).add(playlistId)),
    });
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name || createPending) return;
    createPlaylist(name, {
      onSuccess: (next) => {
        setNewName('');
        const created = next[0];
        if (created) handleAdd(created.id);
      },
    });
  };

  return (
    <div className="py-5">
      <h1
        className="font-['Playfair_Display'] mb-3 text-2xl sm:text-[1.75rem]"
        style={{ color: 'var(--text-primary)', lineHeight: '1.3', fontWeight: '600' }}
      >
        {video.title}
      </h1>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          className="flex items-center gap-3 font-['DM_Sans'] text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span>{formattedViews} views</span>
          <span>•</span>
          <span>{formattedDate}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLikeToggle}
            className="flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:opacity-80"
            style={{
              backgroundColor: isLiked ? 'rgba(201,169,110,0.15)' : 'var(--bg-elevated)',
              color: isLiked ? 'var(--gold-accent)' : 'var(--text-primary)',
            }}
            aria-label={isLiked ? 'Unlike' : 'Like'}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            <Share2 className="w-4 h-4" />
            <span className="font-['DM_Sans'] hidden sm:inline">Share</span>
          </button>

          <button
            type="button"
            onClick={() => setPlaylistOpen(true)}
            title="Add to playlist"
            className="flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            <ListPlus className="w-4 h-4" />
            <span className="font-['DM_Sans'] hidden sm:inline">Playlist</span>
          </button>

          <Dialog open={playlistOpen} onOpenChange={(open) => { setPlaylistOpen(open); if (!open) setAddedIds(new Set()); }}>
            <DialogContent
              className="max-w-sm"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <DialogHeader>
                <DialogTitle className="font-['Playfair_Display'] text-lg" style={{ color: 'var(--text-primary)' }}>
                  Save to playlist
                </DialogTitle>
              </DialogHeader>

              <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                {playlists.length === 0 && (
                  <p className="text-sm py-2" style={{ color: 'var(--text-secondary)' }}>
                    No playlists yet — create one below.
                  </p>
                )}
                {playlists.map((pl) => {
                  const added = addedIds.has(pl.id);
                  return (
                    <button
                      key={pl.id}
                      disabled={added || addPending}
                      onClick={() => handleAdd(pl.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all hover:opacity-80 disabled:cursor-default"
                      style={{
                        backgroundColor: added ? 'rgba(201,169,110,0.1)' : 'var(--bg-elevated)',
                        color: added ? 'var(--gold-accent)' : 'var(--text-primary)',
                      }}
                    >
                      <span className="font-['DM_Sans'] text-sm truncate">{pl.name}</span>
                      <span className="ml-2 text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
                        {added ? <Check className="w-4 h-4" style={{ color: 'var(--gold-accent)' }} /> : `${pl.trackCount} tracks`}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-['DM_Sans'] outline-none"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                  placeholder="New playlist name…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || createPending}
                  className="px-3 py-2 rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--gold-accent)', color: '#000' }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
