import { ChevronRight, ChevronLeft, Play, Clock, Sparkles, TrendingUp } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { useTrendingVideos } from '../components/hooks/useTrendingVideos';
import { usePersonalizedFeed } from '../components/hooks/usePersonalizedFeed';
import { useContinueWatching } from '../components/hooks/useContinueWatching';
import { useTrendingArtists } from '../components/hooks/useTrendingArtists';
import { useAuthState } from '../components/hooks/useAuthState';

function VideoCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="w-full aspect-video rounded-lg mb-3" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      <div className="h-4 rounded w-3/4 mb-2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
    </div>
  );
}

export function Home() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthState();

  const continueRef = useRef<HTMLDivElement>(null);

  const scrollSection = (ref: React.RefObject<HTMLDivElement>, dir: number) => {
    if (ref.current) {
      const card = ref.current.firstElementChild as HTMLElement;
      const cardWidth = card?.offsetWidth ?? 300;
      ref.current.scrollBy({ left: dir * (cardWidth + 24), behavior: 'smooth' });
    }
  };

  const { data: trendingVideos = [], isLoading: videosLoading } = useTrendingVideos(8);
  const { data: personalizedVideos = [], isLoading: personalizedLoading } = usePersonalizedFeed(isLoggedIn);
  const { data: continueWatching = [], isLoading: continueLoading } = useContinueWatching();
  const { data: trendingArtists = [], isLoading: artistsLoading } = useTrendingArtists();

  const heroVideo = trendingVideos[0] ?? null;

  return (
    <div className="pb-8">
      {/* Hero Featured Banner */}
      <div className="relative h-[480px] mb-12 overflow-hidden">
        <ImageWithFallback
          src={heroVideo?.thumbnail ?? ''}
          alt={heroVideo?.title ?? 'Featured performance'}
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, #0D0D0D 0%, rgba(13, 13, 13, 0.7) 40%, rgba(13, 13, 13, 0.3) 70%, transparent 100%)' }}
        />
        <div className="absolute bottom-12 left-6 right-6 max-w-4xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="px-3 py-1 rounded-full text-xs font-['DM_Sans']" style={{
              backgroundColor: 'rgba(201, 169, 110, 0.2)',
              color: 'var(--gold-accent)',
              border: '1px solid rgba(201, 169, 110, 0.3)'
            }}>
              Trending Now
            </div>
          </div>
          <h1 className="font-['Playfair_Display'] mb-4" style={{
            color: 'var(--text-primary)',
            fontSize: '3.5rem',
            lineHeight: '1.1',
            fontWeight: '600'
          }}>
            {heroVideo?.title ?? ''}
          </h1>
          <p className="font-['DM_Sans'] mb-6 max-w-2xl" style={{
            color: 'var(--text-secondary)',
            fontSize: '1.125rem',
            lineHeight: '1.6'
          }}>
            {heroVideo ? `${heroVideo.artist} · ${heroVideo.views} views · ${heroVideo.duration}` : ''}
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => heroVideo && navigate(`/watch/${heroVideo.id}`)}
              className="px-8 py-3 rounded-full font-['DM_Sans'] font-semibold transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: 'var(--gold-accent)', color: 'var(--bg-primary)' }}
              disabled={!heroVideo}
            >
              <Play className="w-5 h-5 fill-current" />
              Watch Now
            </button>
            <button
              onClick={() => heroVideo && navigate(`/search?q=${encodeURIComponent(heroVideo.artist)}`)}
              className="px-8 py-3 rounded-full font-['DM_Sans'] font-semibold transition-all hover:bg-white/20"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'var(--text-primary)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              More by this Artist
            </button>
          </div>
        </div>
      </div>

      {/* Continue Listening */}
      {(continueLoading || continueWatching.length > 0) && (
        <div className="mb-12 px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-['Playfair_Display']" style={{
              color: 'var(--text-primary)',
              fontSize: '1.75rem',
              fontWeight: '600'
            }}>
              Continue Listening
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => scrollSection(continueRef, -1)} className="flex items-center justify-center w-8 h-8 rounded-full transition-opacity hover:opacity-80" style={{ color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => scrollSection(continueRef, 1)} className="flex items-center justify-center w-8 h-8 rounded-full transition-opacity hover:opacity-80" style={{ color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div ref={continueRef} className="flex gap-6 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {continueLoading
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="w-[calc(33.333%-1rem)] flex-none shrink-0"><VideoCardSkeleton /></div>)
              : continueWatching.map((video) => (
                <div
                  key={video.id}
                  onClick={() => navigate(`/watch/${video.videoId}`)}
                  className="cursor-pointer group w-[calc(33.333%-1rem)] flex-none shrink-0"
                >
                  <div className="relative mb-3 rounded-lg overflow-hidden">
                    <ImageWithFallback
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full aspect-video object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--gold-accent)' }}>
                        <Play className="w-7 h-7 fill-current ml-1" style={{ color: 'var(--bg-primary)' }} />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                      <div className="h-full" style={{ backgroundColor: 'var(--gold-accent)', width: `${video.progress}%` }} />
                    </div>
                    <div className="absolute top-3 right-3 px-2 py-1 rounded text-xs font-['DM_Sans']" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', color: '#fff' }}>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {video.progress}%
                    </div>
                  </div>
                  <h3 className="font-['DM_Sans'] mb-1" style={{
                    color: 'var(--text-primary)',
                    fontSize: '0.9375rem',
                    fontWeight: '600'
                  }}>
                    {video.title}
                  </h3>
                  <p className="font-['DM_Sans'] text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {video.artist}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* For You — personalized feed (logged-in users only) */}
      {isLoggedIn && (
        <div className="mb-12 px-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="font-['Playfair_Display']" style={{
                color: 'var(--text-primary)',
                fontSize: '1.75rem',
                fontWeight: '600'
              }}>
                For You
              </h2>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-['DM_Sans']" style={{
                backgroundColor: 'rgba(201, 169, 110, 0.15)',
                color: 'var(--gold-accent)',
                border: '1px solid rgba(201, 169, 110, 0.25)'
              }}>
                <Sparkles className="w-3 h-3" />
                Personalised
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {personalizedLoading
              ? Array.from({ length: 6 }).map((_, i) => <VideoCardSkeleton key={i} />)
              : personalizedVideos.map((video) => (
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
                  <h3 className="font-['DM_Sans'] mb-1" style={{
                    color: 'var(--text-primary)',
                    fontSize: '0.9375rem',
                    fontWeight: '600'
                  }}>
                    {video.title}
                  </h3>
                  <p className="font-['DM_Sans'] text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                    {video.artist}
                  </p>
                  <p className="font-['DM_Sans'] text-xs" style={{ color: 'var(--gold-accent)', opacity: 0.8 }}>
                    {video.reason}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}


      {/* Trending Artists This Week */}
      <div className="mb-12 px-6">
        <h2 className="font-['Playfair_Display'] mb-6" style={{
          color: 'var(--text-primary)',
          fontSize: '1.75rem',
          fontWeight: '600'
        }}>
          Trending Artists This Week
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {artistsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="w-full aspect-square rounded-lg mb-3" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                  <div className="h-4 rounded w-3/4 mb-2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                  <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                </div>
              ))
            : trendingArtists.map((artist) => (
                <div
                  key={artist.id}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(artist.name)}`)}
                  className="cursor-pointer group"
                >
                  <div className="relative mb-3 rounded-lg overflow-hidden">
                    <ImageWithFallback
                      src={artist.image}
                      alt={artist.name}
                      className="w-full aspect-square object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 md:bottom-4 md:left-4 md:right-4">
                      <div className="px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xs font-['DM_Sans'] inline-block mb-1 md:mb-2 truncate max-w-full" style={{
                        backgroundColor: 'rgba(201, 169, 110, 0.3)',
                        color: 'var(--gold-accent)'
                      }}>
                        {artist.genre}
                      </div>
                      <h3 className="font-['Playfair_Display'] text-white text-sm md:text-xl truncate" style={{
                        fontWeight: '600',
                        lineHeight: '1.2'
                      }}>
                        {artist.name}
                      </h3>
                    </div>
                  </div>
                  <p className="font-['DM_Sans'] text-xs md:text-sm mb-1.5 line-clamp-2" style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {artist.tagline}
                  </p>
                  <div className="font-['DM_Sans'] text-xs" style={{ color: 'var(--gold-accent)' }}>
                    {artist.listeners}
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* Trending Right Now*/}
      <div className="px-6">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-['Playfair_Display']" style={{
            color: 'var(--text-primary)',
            fontSize: '1.75rem',
            fontWeight: '600'
          }}>
            Trending Right Now
          </h2>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-['DM_Sans']" style={{
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            color: '#ff4444',
            border: '1px solid rgba(255, 0, 0, 0.2)'
          }}>
            <TrendingUp className="w-3 h-3" />
            Live
          </div>
        </div>
        <div className="grid grid-cols-4 gap-6">
          {videosLoading
            ? Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)
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
                  fontWeight: '600'
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
    </div>
  );
}
