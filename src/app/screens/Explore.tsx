import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Network, Play, TrendingUp } from 'lucide-react';
import { useFollowing } from '../components/hooks/useLibraryData';
import { useTrendingVideos } from '../components/hooks/useTrendingVideos';
import { useGenreArtists } from '../components/hooks/useGenreArtists';
import { useAuthState } from '../components/hooks/useAuthState';
import { useGenreVideos } from '../components/hooks/useGenreVideos';
import { useWikipediaArtistImage } from '../components/hooks/useWikipediaArtistImage';
import type { TrendingArtist } from '../components/hooks/useTrendingArtists';

const ALL_GENRES = ['Pop', 'Rock', 'Hip-Hop', 'Country', 'Jazz', 'Classical', 'Electronic'];

export function Explore() {
  const [activeGenre, setActiveGenre] = useState('Pop');
  const navigate = useNavigate();

  const { isLoggedIn } = useAuthState();
  const { data: following = [] } = useFollowing();

  // Derive preferred genres only for logged-in users
  const userGenres = useMemo(() => {
    if (!isLoggedIn) return [];
    const counts: Record<string, number> = {};
    for (const a of following) {
      counts[a.genre] = (counts[a.genre] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);
  }, [isLoggedIn, following]);

  // Same real YouTube trending chart as Home screen
  const { data: trendingVideos = [], isLoading: trendingLoading } = useTrendingVideos(8);
  const { data: trendingArtists = [], isLoading: artistsLoading } = useGenreArtists(activeGenre);

  // Logged-in: user's genres bubble to the front; logged-out: static list
  const genres = useMemo(() => {
    if (!isLoggedIn || userGenres.length === 0) return ALL_GENRES;
    const userFirst = userGenres.filter((g) => ALL_GENRES.includes(g));
    const rest = ALL_GENRES.filter((g) => !userFirst.includes(g));
    return [...userFirst, ...rest];
  }, [isLoggedIn, userGenres]);

const { data: genreVideos = [], isLoading: genreLoading } = useGenreVideos(activeGenre);

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b" style={{ borderColor: '#1a1a1a' }}>
        <h1 className="font-['Playfair_Display'] mb-2" style={{ 
          color: 'var(--text-primary)',
          fontSize: '2.5rem',
          fontWeight: '600'
        }}>
          Explore
        </h1>
        <p className="font-['DM_Sans']" style={{ 
          color: 'var(--text-secondary)',
          fontSize: '1rem'
        }}>
          Discover new artists and sounds from around the world
        </p>
      </div>

      {/* Genre Filter Pills */}
      <div className="px-6 py-6 border-b" style={{ borderColor: '#1a1a1a' }}>
        {isLoggedIn && userGenres.length > 0 && (
          <p className="font-['DM_Sans'] text-xs mb-3" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
            ✦ Your genres
          </p>
        )}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {genres.map((genre) => {
            const isUserGenre = isLoggedIn && genre !== 'All' && userGenres.includes(genre);
            const isActive = activeGenre === genre;
            return (
              <button
                key={genre}
                onClick={() => setActiveGenre(genre)}
                className="px-5 py-2 rounded-full font-['DM_Sans'] text-sm whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-1.5"
                style={{
                  backgroundColor: isActive
                    ? 'var(--gold-accent)'
                    : isUserGenre
                    ? 'rgba(201, 169, 110, 0.12)'
                    : 'var(--bg-elevated)',
                  color: isActive ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive || isUserGenre ? '600' : '400',
                  border: isUserGenre && !isActive
                    ? '1px solid rgba(201, 169, 110, 0.35)'
                    : '1px solid transparent',
                }}
              >
                {isUserGenre && !isActive && (
                  <span style={{ color: 'var(--gold-accent)', fontSize: '0.55rem', lineHeight: 1 }}>✦</span>
                )}
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      {/* Genre Songs */}
      <div className="px-6 py-8 border-b" style={{ borderColor: '#1a1a1a' }}>
          <h2 className="font-['Playfair_Display'] mb-6" style={{
            color: 'var(--text-primary)',
            fontSize: '1.75rem',
            fontWeight: '600'
          }}>
            {activeGenre} Songs
          </h2>
          <div className="grid grid-cols-4 gap-6">
            {genreLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="w-full aspect-video rounded-lg mb-3" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                    <div className="h-4 rounded w-3/4 mb-2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                    <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                  </div>
                ))
              : genreVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => navigate(`/watch/${video.id}`)}
                    className="cursor-pointer group"
                  >
                    <div className="relative mb-3 rounded-lg overflow-hidden">
                      <ImageWithFallback
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full aspect-video object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--gold-accent)' }}>
                          <Play className="w-6 h-6 fill-current ml-0.5" style={{ color: 'var(--bg-primary)' }} />
                        </div>
                      </div>
                    </div>
                    <h3 className="font-['DM_Sans'] mb-1 line-clamp-2" style={{
                      color: 'var(--text-primary)',
                      fontSize: '0.9375rem',
                      fontWeight: '600'
                    }}>
                      {video.title}
                    </h3>
                    <p className="font-['DM_Sans'] text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {video.artist}
                    </p>
                  </div>
                ))}
          </div>
        </div>

      {/* Artists You Might Know */}
      <div className="py-8">
        <h2 className="font-['Playfair_Display'] px-6 mb-6" style={{
          color: 'var(--text-primary)',
          fontSize: '1.75rem',
          fontWeight: '600'
        }}>
          Artists You Might Know
        </h2>
        <div className="flex gap-4 overflow-x-auto px-6 pb-2" style={{ scrollbarWidth: 'none' }}>
          {artistsLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 animate-pulse" style={{ width: '180px' }}>
                  <div className="rounded-xl mb-3" style={{ width: '180px', height: '240px', backgroundColor: 'var(--bg-elevated)' }} />
                  <div className="h-3 rounded mb-2" style={{ width: '120px', backgroundColor: 'var(--bg-elevated)' }} />
                  <div className="h-3 rounded" style={{ width: '80px', backgroundColor: 'var(--bg-elevated)' }} />
                </div>
              ))
            : trendingArtists.map((artist) => (
                <GenreArtistCard key={artist.id} artist={artist} />
              ))}
        </div>
      </div>

      {/* Connections Map Promo */}
      <div className="px-6 py-8">
        <div 
          className="rounded-xl p-12 relative overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.03\'/%3E%3C/svg%3E")'
          }}
        >
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Network className="w-6 h-6" style={{ color: 'var(--gold-accent)' }} />
              <span className="font-['DM_Sans'] text-sm tracking-wider uppercase" style={{ color: 'var(--gold-accent)' }}>
                New Feature
              </span>
            </div>
            <h2 className="font-['Playfair_Display'] mb-4" style={{ 
              color: 'var(--text-primary)',
              fontSize: '2.25rem',
              fontWeight: '600',
              lineHeight: '1.2'
            }}>
              Explore the Musical Universe
            </h2>
            <p className="font-['DM_Sans'] mb-8" style={{ 
              color: 'var(--text-secondary)',
              fontSize: '1.125rem',
              lineHeight: '1.7'
            }}>
              Discover how your favorite artists are connected through collaborations, influences, and shared musical journeys. Our interactive Connections Map reveals the hidden web of musical relationships.
            </p>
            <button 
              onClick={() => navigate('/artists')}
              className="px-8 py-3 rounded-full font-['DM_Sans'] font-semibold transition-all hover:scale-105"
              style={{ 
                backgroundColor: 'var(--gold-accent)',
                color: 'var(--bg-primary)'
              }}
            >
              Explore Connections Map
            </button>
          </div>
        </div>
      </div>

      {/* Trending Right Now */}
      <div className="px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-['Playfair_Display']" style={{
            color: 'var(--text-primary)',
            fontSize: '1.75rem',
            fontWeight: '600',
          }}>
            Trending Right Now
          </h2>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-['DM_Sans']" style={{
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            color: '#ff4444',
            border: '1px solid rgba(255, 0, 0, 0.2)',
          }}>
            <TrendingUp className="w-3 h-3" />
            Live
          </div>
        </div>
        <div className="grid grid-cols-4 gap-6">
          {trendingLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="w-full aspect-video rounded-lg mb-3" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                  <div className="h-4 rounded w-3/4 mb-2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                  <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                </div>
              ))
            : trendingVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => navigate(`/watch/${video.id}`)}
                  className="cursor-pointer group"
                >
                  <div className="relative mb-3 rounded-lg overflow-hidden">
                    <ImageWithFallback
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full aspect-video object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--gold-accent)' }}>
                        <Play className="w-6 h-6 fill-current ml-0.5" style={{ color: 'var(--bg-primary)' }} />
                      </div>
                    </div>
                    {video.duration !== '—' && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-['DM_Sans']" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', color: '#fff' }}>
                        {video.duration}
                      </div>
                    )}
                  </div>
                  <h3 className="font-['DM_Sans'] mb-1 line-clamp-2" style={{
                    color: 'var(--text-primary)',
                    fontSize: '0.9375rem',
                    fontWeight: '600',
                  }}>
                    {video.title}
                  </h3>
                  <p className="font-['DM_Sans'] text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                    {video.artist}
                  </p>
                  {video.views !== '—' && (
                    <p className="font-['DM_Sans'] text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {video.views} views
                    </p>
                  )}
                </div>
              ))}
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

// ─── Artist card sub-component ────────────────────────────────────────────────
// Needs its own component so it can call a hook per artist.

function GenreArtistCard({ artist }: { artist: TrendingArtist }) {
  const navigate = useNavigate();
  const { data: wikiImage } = useWikipediaArtistImage(artist.name);

  // Use YouTube channel thumbnail first; fall back to Wikipedia image
  const imageSrc = artist.image || wikiImage || '';

  return (
    <div
      onClick={() => navigate(`/artist/${artist.id}`)}
      className="flex-shrink-0 cursor-pointer group"
      style={{ width: '180px' }}
    >
      <div className="relative rounded-xl overflow-hidden mb-3" style={{ width: '180px', height: '240px' }}>
        <ImageWithFallback
          src={imageSrc}
          alt={artist.name}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 70%)' }}
        />
        <div className="absolute bottom-3 left-3 right-3">
          <div
            className="px-2 py-0.5 rounded-full text-xs font-['DM_Sans'] inline-block mb-1.5"
            style={{
              backgroundColor: 'rgba(201, 169, 110, 0.3)',
              color: 'var(--gold-accent)',
              border: '1px solid rgba(201, 169, 110, 0.4)',
            }}
          >
            {artist.genre}
          </div>
          <h3
            className="font-['Playfair_Display'] text-white leading-tight"
            style={{ fontSize: '1rem', fontWeight: '600' }}
          >
            {artist.name}
          </h3>
          <p className="font-['DM_Sans'] mt-1" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
            {artist.listeners}
          </p>
        </div>
      </div>
    </div>
  );
}
