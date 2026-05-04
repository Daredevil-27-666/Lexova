import { memo, useState } from 'react';
import { Music, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useArtist } from '../hooks/useArtist';
import { useSimilarArtists, SimilarArtist } from '../hooks/useSimilarArtists';
import { useWikipediaThumbnail } from '../hooks/useWikipediaThumbnail';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

interface ConnectionsTabProps {
  artistId: string;
}

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;
const PROXY_HEADERS = { Authorization: `Bearer ${publicAnonKey}` };

// Step 1: search for a video by artist name → get video ID
// Step 2: fetch that video's details → get channelId
async function findYouTubeChannelId(artistName: string): Promise<string | null> {
  try {
    const searchRes = await fetch(
      `${SERVER_BASE}/youtube/search?q=${encodeURIComponent(artistName)}&maxResults=1`,
      { headers: PROXY_HEADERS },
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();

    const videoId = searchData.videos?.[0]?.id as string | undefined;
    if (!videoId) return null;

    const videoRes = await fetch(
      `${SERVER_BASE}/youtube/video?id=${encodeURIComponent(videoId)}`,
      { headers: PROXY_HEADERS },
    );
    if (!videoRes.ok) return null;
    const videoData = await videoRes.json();

    return (videoData.channelId as string) ?? null;
  } catch {
    return null;
  }
}

const ConnectionsTab = memo(function ConnectionsTab({ artistId }: ConnectionsTabProps) {
  const { data: artist } = useArtist(artistId);
  const { data: similar = [], isLoading, error } = useSimilarArtists(artist?.name ?? '');

  return (
    <div>
      <h3
        className="font-['Playfair_Display'] mb-6"
        style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: '600' }}
      >
        Similar Artists
      </h3>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading similar artists…
        </div>
      ) : error || similar.length === 0 ? (
        <p className="font-['DM_Sans'] text-sm" style={{ color: 'var(--text-secondary)' }}>
          {error ? 'Similar artists unavailable for this artist.' : 'No similar artists found.'}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {similar.map((artist) => (
            <SimilarArtistCard key={artist.name} artist={artist} />
          ))}
        </div>
      )}
    </div>
  );
});

export { ConnectionsTab };

// ─── Per-card sub-component ───────────────────────────────────────────────────

function SimilarArtistCard({ artist }: { artist: SimilarArtist }) {
  const { data: thumbnail } = useWikipediaThumbnail(artist.name);
  const navigate = useNavigate();
  const [searching, setSearching] = useState(false);

  const handleClick = async () => {
    setSearching(true);
    const channelId = await findYouTubeChannelId(artist.name);
    setSearching(false);
    if (channelId) {
      navigate(`/artist/${channelId}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="rounded-lg overflow-hidden transition-all hover:scale-105 cursor-pointer group"
      style={{ backgroundColor: 'var(--bg-elevated)' }}
    >
      {/* Image / fallback icon */}
      <div
        className="relative aspect-square overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: 'var(--surface-secondary)' }}
      >
        {thumbnail ? (
          <ImageWithFallback
            src={thumbnail}
            alt={artist.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-110"
          />
        ) : (
          <Music
            className="w-12 h-12 transition-transform group-hover:scale-110"
            style={{ color: 'var(--accent)' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Searching overlay */}
        {searching && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        )}

        {/* Name overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h4
            className="font-['Playfair_Display'] text-white"
            style={{ fontSize: '1.125rem', fontWeight: '600' }}
          >
            {artist.name}
          </h4>
        </div>
      </div>

      {/* CTA */}
      <div className="p-4">
        <p
          className="font-['DM_Sans'] text-sm"
          style={{ color: 'var(--accent)', lineHeight: '1.5' }}
        >
          {searching ? 'Finding artist…' : 'View artist profile →'}
        </p>
      </div>
    </div>
  );
}
