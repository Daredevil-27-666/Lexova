import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Play, Shuffle, Globe, Lock, Trash2, Heart, Plus,
  MoreHorizontal, GripVertical, Music, Pencil, Check, X, Loader2
} from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  useLikedVideos, useToggleLikedVideo, useYouTubeVideoMeta,
  usePlaylists, useDeletePlaylist,
  type LikedVideo,
} from '../components/hooks/useLibraryData';

interface Track {
  id: string;
  position: number;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
  liked: boolean;
}

interface TrackRowProps {
  track: Track;
  index: number;
  isPlaying: boolean;
  isOwner: boolean;
  onPlay: () => void;
  onLike: () => void;
  onRemove: () => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
}

function TrackRow({ track, index, isPlaying, isOwner, onPlay, onLike, onRemove, onMove }: TrackRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const [{ isDragging }, drag, preview] = useDrag({
    type: 'track',
    item: { index },
    canDrag: isOwner,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'track',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        onMove(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex items-center gap-4 px-6 py-3 transition-all hover:bg-[var(--amazon-hover)] rounded-lg"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {/* Drag Handle / Number / Play Icon */}
      <div className="w-10 flex items-center justify-center flex-shrink-0">
        {isOwner && isHovered ? (
          <GripVertical className="w-4 h-4 cursor-grab" style={{ color: 'var(--text-secondary)' }} />
        ) : isPlaying ? (
          <div className="flex items-center gap-0.5">
            <div className="w-0.5 h-3 animate-pulse" style={{ backgroundColor: 'var(--gold-accent)', animation: 'pulse 1.2s ease-in-out infinite' }} />
            <div className="w-0.5 h-4 animate-pulse" style={{ backgroundColor: 'var(--gold-accent)', animation: 'pulse 1.2s ease-in-out 0.2s infinite' }} />
            <div className="w-0.5 h-3 animate-pulse" style={{ backgroundColor: 'var(--gold-accent)', animation: 'pulse 1.2s ease-in-out 0.4s infinite' }} />
          </div>
        ) : isHovered ? (
          <button onClick={onPlay} className="transition-opacity hover:opacity-80">
            <Play className="w-4 h-4 fill-current" style={{ color: 'var(--text-primary)' }} />
          </button>
        ) : (
          <span className="font-['DM_Sans'] text-sm" style={{ color: 'var(--text-secondary)' }}>
            {index + 1}
          </span>
        )}
      </div>

      {/* Thumbnail */}
      <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
        <ImageWithFallback
          src={track.thumbnail}
          alt={track.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Title & Artist */}
      <div className="flex-1 min-w-0">
        <div className="font-['DM_Sans'] truncate" style={{ 
          color: isPlaying ? 'var(--gold-accent)' : 'var(--text-primary)',
          fontSize: '0.9375rem',
          fontWeight: isPlaying ? '600' : '400'
        }}>
          {track.title}
        </div>
        <div className="font-['DM_Sans'] text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
          {track.artist}
        </div>
      </div>

      {/* Duration */}
      <div className="w-20 text-right font-['DM_Sans'] text-sm" style={{ color: 'var(--text-secondary)' }}>
        {track.duration}
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-2 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <button 
          onClick={onLike}
          className="transition-colors hover:opacity-80"
        >
          <Heart 
            className={`w-4 h-4 ${track.liked ? 'fill-current' : ''}`}
            style={{ color: track.liked ? 'var(--gold-accent)' : 'var(--text-secondary)' }} 
          />
        </button>
        <button className="transition-opacity hover:opacity-80">
          <Plus className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
        {isOwner && (
          showRemoveConfirm ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={onRemove}
                className="px-2 py-1 rounded text-xs font-['DM_Sans']"
                style={{ backgroundColor: '#E8420A', color: '#fff' }}
              >
                Confirm
              </button>
              <button 
                onClick={() => setShowRemoveConfirm(false)}
                className="px-2 py-1 rounded text-xs font-['DM_Sans']"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowRemoveConfirm(true)}
              className="transition-opacity hover:opacity-80"
            >
              <Trash2 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          )
        )}
        <button className="transition-opacity hover:opacity-80">
          <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
    </div>
  );
}

// ─── Liked Songs sub-components ───────────────────────────────────────────────

function LikedSongRow({ liked, index, isPlaying, onPlay }: {
  liked: LikedVideo;
  index: number;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  const { data: meta, isLoading } = useYouTubeVideoMeta(liked.videoId);
  const { mutate: toggleLike } = useToggleLikedVideo();
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 px-6 py-3 animate-pulse">
        <div className="w-10 h-4 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        <div className="w-12 h-12 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-4 rounded w-1/2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
          <div className="h-3 rounded w-1/3" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        </div>
        <div className="w-12 h-3 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group flex items-center gap-4 px-6 py-3 rounded-lg transition-all hover:bg-[var(--amazon-hover)]"
    >
      {/* Index / Play */}
      <div className="w-10 flex items-center justify-center flex-shrink-0">
        {isPlaying ? (
          <div className="flex items-center gap-0.5">
            <div className="w-0.5 h-3 animate-pulse" style={{ backgroundColor: 'var(--gold-accent)' }} />
            <div className="w-0.5 h-4 animate-pulse" style={{ backgroundColor: 'var(--gold-accent)' }} />
            <div className="w-0.5 h-3 animate-pulse" style={{ backgroundColor: 'var(--gold-accent)' }} />
          </div>
        ) : isHovered ? (
          <button onClick={onPlay} className="hover:opacity-80">
            <Play className="w-4 h-4 fill-current" style={{ color: 'var(--text-primary)' }} />
          </button>
        ) : (
          <span className="font-['DM_Sans'] text-sm" style={{ color: 'var(--text-secondary)' }}>{index + 1}</span>
        )}
      </div>

      {/* Thumbnail */}
      <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
        <ImageWithFallback src={meta?.thumbnail ?? ''} alt={meta?.title ?? ''} className="w-full h-full object-cover" />
      </div>

      {/* Title & Artist */}
      <div className="flex-1 min-w-0">
        <div
          className="font-['DM_Sans'] truncate cursor-pointer hover:underline"
          style={{ color: isPlaying ? 'var(--gold-accent)' : 'var(--text-primary)', fontSize: '0.9375rem', fontWeight: isPlaying ? '600' : '400' }}
          onClick={() => navigate(`/watch/${liked.videoId}`)}
        >
          {meta?.title ?? liked.videoId}
        </div>
        <div className="font-['DM_Sans'] text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
          {meta?.artist ?? ''}
        </div>
      </div>

      {/* Duration */}
      <div className="w-20 text-right font-['DM_Sans'] text-sm" style={{ color: 'var(--text-secondary)' }}>
        {meta?.duration ?? '—'}
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-2 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <button onClick={() => toggleLike(liked.videoId)} className="hover:opacity-80" title="Unlike">
          <Heart className="w-4 h-4 fill-current" style={{ color: 'var(--gold-accent)' }} />
        </button>
        <button className="hover:opacity-80" onClick={() => navigate(`/watch/${liked.videoId}`)}>
          <Play className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
        <button className="hover:opacity-80">
          <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
    </div>
  );
}

function LikedPlaylist() {
  const { data: likedVideos = [], isLoading } = useLikedVideos();
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="px-6 pt-8 pb-8">
        <div className="flex gap-8">
          <div className="w-40 h-40 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.4) 0%, rgba(201,169,110,0.1) 100%)', border: '1px solid rgba(201,169,110,0.3)' }}>
            <Heart className="w-16 h-16 fill-current" style={{ color: 'var(--gold-accent)' }} />
          </div>
          <div className="flex-1">
            <div className="font-['DM_Sans'] text-xs mb-2" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Playlist</div>
            <h1 className="font-['Playfair_Display'] mb-3" style={{ color: 'var(--text-primary)', fontSize: '2.25rem', fontWeight: '900', lineHeight: '1.2' }}>Liked Songs</h1>
            <p className="font-['DM_Sans'] mb-4" style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
              {likedVideos.length} {likedVideos.length === 1 ? 'video' : 'videos'} you've liked
            </p>
            <div className="flex items-center gap-3">
              <button
                className="px-8 py-3 rounded-full font-['DM_Sans'] font-semibold transition-all hover:scale-105 flex items-center gap-2"
                style={{ backgroundColor: 'var(--gold-accent)', color: '#fff' }}
                onClick={() => likedVideos[0] && navigate(`/watch/${likedVideos[0].videoId}`)}
              >
                <Play className="w-5 h-5 fill-current" />
                Play
              </button>
              <button
                className="px-6 py-3 rounded-full font-['DM_Sans'] font-semibold transition-all hover:bg-[var(--amazon-hover)] flex items-center gap-2"
                style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <Shuffle className="w-4 h-4" />
                Shuffle
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="px-6">
        {isLoading ? (
          <div className="flex items-center gap-2 py-10 justify-center" style={{ color: 'var(--text-secondary)' }}>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-['DM_Sans'] text-sm">Loading liked songs…</span>
          </div>
        ) : likedVideos.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
            <h3 className="font-['Playfair_Display'] mb-2" style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '600' }}>No liked songs yet</h3>
            <p className="font-['DM_Sans'] mb-6" style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
              Hit the thumbs up on any video to save it here
            </p>
            <button onClick={() => navigate('/')} className="px-8 py-3 rounded-full font-['DM_Sans'] font-semibold transition-all hover:scale-105" style={{ backgroundColor: 'var(--gold-accent)', color: '#fff' }}>
              Browse Music
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 px-6 py-3 border-b mb-2" style={{ borderColor: '#1a1a1a' }}>
              <div className="w-10 font-['DM_Sans'] text-xs" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</div>
              <div className="w-12" />
              <div className="flex-1 font-['DM_Sans'] text-xs" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</div>
              <div className="w-20 text-right font-['DM_Sans'] text-xs" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</div>
              <div className="w-24" />
            </div>
            <div className="space-y-1">
              {likedVideos.map((liked, index) => (
                <LikedSongRow
                  key={liked.videoId}
                  liked={liked}
                  index={index}
                  isPlaying={currentVideoId === liked.videoId}
                  onPlay={() => { setCurrentVideoId(liked.videoId); navigate(`/watch/${liked.videoId}`); }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Playlist() {
  const { playlistId } = useParams();
  if (playlistId === 'liked') return <LikedPlaylist />;
  return <UserPlaylist playlistId={playlistId!} />;
}

function UserPlaylist({ playlistId }: { playlistId: string }) {
  const navigate = useNavigate();
  const { data: playlists = [], isLoading } = usePlaylists();
  const { mutate: deletePlaylist } = useDeletePlaylist();

  const meta = playlists.find((p) => p.id === playlistId);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  useEffect(() => {
    if (meta) {
      setName(meta.name);
      setEditedName(meta.name);
    }
  }, [meta?.name]);

  const totalDuration = tracks.reduce((acc: number, track: Track) => {
    const [mins, secs] = track.duration.split(':').map(Number);
    return acc + mins * 60 + secs;
  }, 0);

  const formatTotalDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours} hr ${mins} min`;
    return `${mins} min`;
  };

  const moveTrack = (dragIndex: number, hoverIndex: number) => {
    const updated = [...tracks];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(hoverIndex, 0, moved);
    setTracks(updated.map((t: Track, i: number) => ({ ...t, position: i })));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--gold-accent)' }} />
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Music className="w-16 h-16" style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
        <p className="font-['DM_Sans']" style={{ color: 'var(--text-secondary)' }}>Playlist not found</p>
        <button onClick={() => navigate('/library')} className="px-6 py-2 rounded-full font-['DM_Sans'] text-sm" style={{ backgroundColor: 'var(--gold-accent)', color: '#fff' }}>
          Back to Library
        </button>
      </div>
    );
  }

  const coverArt = tracks.length > 0 ? (
    <div className="w-40 h-40 rounded-lg overflow-hidden grid grid-cols-2 gap-0.5" style={{ backgroundColor: '#000' }}>
      {tracks.slice(0, 4).map((t: Track, i: number) => (
        <ImageWithFallback key={i} src={t.thumbnail} alt="" className="w-full h-full object-cover" />
      ))}
    </div>
  ) : (
    <div className="w-40 h-40 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
      <span className="font-['Playfair_Display']" style={{ color: 'var(--text-primary)', fontSize: '4rem', fontWeight: '600' }}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen pb-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="px-6 pt-8 pb-8">
          <div className="flex gap-8">
            <div className="flex-shrink-0">{coverArt}</div>
            <div className="flex-1">
              <div className="font-['DM_Sans'] text-xs mb-2" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Playlist
              </div>

              {/* Name */}
              {isEditingName ? (
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="flex-1 bg-transparent border-b pb-1 outline-none font-['Playfair_Display']"
                    style={{ borderColor: 'var(--gold-accent)', color: 'var(--text-primary)', fontSize: '2.25rem', fontWeight: '900' }}
                    autoFocus
                  />
                  <button onClick={() => { setName(editedName); setIsEditingName(false); }} className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80" style={{ backgroundColor: 'var(--gold-accent)' }}>
                    <Check className="w-4 h-4" style={{ color: '#fff' }} />
                  </button>
                  <button onClick={() => { setEditedName(name); setIsEditingName(false); }} className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                    <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                </div>
              ) : (
                <div className="group flex items-center gap-2 mb-3">
                  <h1 className="font-['Playfair_Display']" style={{ color: 'var(--text-primary)', fontSize: '2.25rem', lineHeight: '1.2', fontWeight: '900' }}>
                    {name}
                  </h1>
                  <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                </div>
              )}

              {/* Description */}
              {isEditingDescription ? (
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="text"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="flex-1 bg-transparent border-b pb-1 outline-none font-['DM_Sans']"
                    style={{ borderColor: 'var(--gold-accent)', color: 'var(--text-secondary)', fontSize: '0.9375rem' }}
                    autoFocus
                  />
                  <button onClick={() => { setDescription(editedDescription); setIsEditingDescription(false); }} className="w-7 h-7 rounded-full flex items-center justify-center hover:opacity-80" style={{ backgroundColor: 'var(--gold-accent)' }}>
                    <Check className="w-3.5 h-3.5" style={{ color: '#fff' }} />
                  </button>
                  <button onClick={() => { setEditedDescription(description); setIsEditingDescription(false); }} className="w-7 h-7 rounded-full flex items-center justify-center hover:opacity-80" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                    <X className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                </div>
              ) : (
                <div className="group flex items-center gap-2 mb-4">
                  <p className="font-['DM_Sans']" style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                    {description || 'Add a description…'}
                  </p>
                  <button onClick={() => setIsEditingDescription(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                </div>
              )}

              <div className="font-['DM_Sans'] text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}{tracks.length > 0 ? ` • ${formatTotalDuration(totalDuration)}` : ''}
              </div>

              <div className="flex items-center gap-3">
                <button className="px-8 py-3 rounded-full font-['DM_Sans'] font-semibold transition-all hover:scale-105 flex items-center gap-2" style={{ backgroundColor: 'var(--gold-accent)', color: '#fff' }}>
                  <Play className="w-5 h-5 fill-current" /> Play
                </button>
                <button className="px-6 py-3 rounded-full font-['DM_Sans'] font-semibold transition-all hover:bg-[var(--amazon-hover)] flex items-center gap-2" style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <Shuffle className="w-4 h-4" /> Shuffle
                </button>
                <button
                  onClick={() => setIsPublic((p) => !p)}
                  className="px-6 py-3 rounded-full font-['DM_Sans'] font-semibold transition-all hover:bg-[var(--amazon-hover)] flex items-center gap-2"
                  style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {isPublic ? 'Public' : 'Private'}
                </button>
                <button
                  onClick={() => { deletePlaylist(playlistId); navigate('/library'); }}
                  className="px-6 py-3 rounded-full font-['DM_Sans'] font-semibold transition-all hover:bg-[var(--amazon-hover)] flex items-center gap-2"
                  style={{ backgroundColor: 'transparent', color: '#E8420A', border: '1px solid #E8420A' }}
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Track List */}
        <div className="px-6">
          {tracks.length === 0 ? (
            <div className="text-center py-20">
              <Music className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
              <h3 className="font-['Playfair_Display'] mb-2" style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '600' }}>
                This playlist is empty
              </h3>
              <p className="font-['DM_Sans'] mb-6" style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                Search for songs and add them here
              </p>
              <button onClick={() => navigate('/search')} className="px-8 py-3 rounded-full font-['DM_Sans'] font-semibold transition-all hover:scale-105" style={{ backgroundColor: 'var(--gold-accent)', color: '#fff' }}>
                Find Music
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 px-6 py-3 border-b mb-2" style={{ borderColor: '#1a1a1a' }}>
                <div className="w-10 font-['DM_Sans'] text-xs" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</div>
                <div className="w-12" />
                <div className="flex-1 font-['DM_Sans'] text-xs" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</div>
                <div className="w-20 text-right font-['DM_Sans'] text-xs" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</div>
                <div className="w-32" />
              </div>
              <div className="space-y-1">
                {tracks.map((track: Track, index: number) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={index}
                    isPlaying={currentTrackId === track.id}
                    isOwner={true}
                    onPlay={() => setCurrentTrackId(track.id)}
                    onLike={() => {
                      const updated = [...tracks];
                      updated[index] = { ...track, liked: !track.liked };
                      setTracks(updated);
                    }}
                    onRemove={() => setTracks(tracks.filter((_: Track, i: number) => i !== index))}
                    onMove={moveTrack}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </DndProvider>
  );
}
