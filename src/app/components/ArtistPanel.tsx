import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AboutTab } from './artist-panel/AboutTab';
import { DiscographyTab } from './artist-panel/DiscographyTab';
import { TimelineTab } from './artist-panel/TimelineTab';
import { ConnectionsTab } from './artist-panel/ConnectionsTab';
import { useArtist } from './hooks/useArtist';

type SubTab = 'about' | 'discography' | 'timeline' | 'connections';

interface ArtistPanelProps {
  artistId?: string;
}

// Stable reference — no recreating on render
const formatNumber = (num: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);

const TABS: { id: SubTab; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'discography', label: 'Discography' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'connections', label: 'Connections' },
];

export function ArtistPanel({ artistId = '' }: ArtistPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('about');
  const { data: artist, isLoading, isError } = useArtist(artistId);

  // No channel ID yet — video details still loading
  if (!artistId) {
    return (
      <div className="h-96 flex items-center justify-center animate-pulse" style={{ color: 'var(--text-secondary)' }}>
        Loading artist info…
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="h-96 flex items-center justify-center"
        style={{ color: 'var(--text-secondary)' }}
      >
        Loading artist profile...
      </div>
    );
  }

  if (isError || !artist) {
    return (
      <div
        className="h-96 flex items-center justify-center text-red-400"
        style={{ backgroundColor: 'var(--bg-panel)' }}
      >
        Failed to load artist data.
      </div>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden relative"
      style={{ backgroundColor: 'var(--bg-panel)' }}
    >
      {/* Artist Header */}
      <div className="px-6 pt-6 pb-5 border-b" style={{ borderColor: '#1a1a1a' }}>
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <img
              src={artist.avatarUrl}
              alt={artist.name}
              className="w-28 h-28 rounded-full object-cover ring-2 ring-[var(--gold-accent)]"
            />
          </div>

          <div className="flex-1">
            {artist.isFeatured && (
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" style={{ color: 'var(--gold-accent)' }} />
                <span
                  className="font-['DM_Sans'] text-xs tracking-wider uppercase"
                  style={{ color: 'var(--gold-accent)' }}
                >
                  Featured Artist
                </span>
              </div>
            )}

            <h2
              className="font-['Playfair_Display'] mb-3 text-[2rem] leading-tight font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {artist.name}
            </h2>

            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {artist.genres.map((genre) => (
                <span
                  key={genre}
                  className="px-3 py-1 rounded-full font-['DM_Sans'] text-xs"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: 'var(--gold-accent)',
                  }}
                >
                  {genre}
                </span>
              ))}
            </div>

            <p
              className="font-['DM_Sans'] mb-3 max-w-2xl line-clamp-3 text-[0.9375rem] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {artist.bio}
            </p>

            <div className="flex items-center gap-6">
              <div>
                <div
                  className="font-['DM_Sans'] text-2xl font-semibold leading-none"
                  style={{ color: 'var(--gold-accent)' }}
                >
                  {formatNumber(artist.stats.monthlyListeners)}
                </div>
                <div
                  className="font-['DM_Sans'] text-xs mt-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Monthly Listeners
                </div>
              </div>

              <div className="w-px h-10" style={{ backgroundColor: '#1a1a1a' }} />

              <div>
                <div
                  className="font-['DM_Sans'] text-2xl font-semibold leading-none"
                  style={{ color: 'var(--gold-accent)' }}
                >
                  {artist.stats.videoCount}
                </div>
                <div
                  className="font-['DM_Sans'] text-xs mt-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Videos
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="border-b" style={{ borderColor: '#1a1a1a' }}>
        <div role="tablist" className="flex items-center gap-1 px-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeSubTab === tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className="px-4 py-3 font-['DM_Sans'] text-sm transition-all relative"
              style={{
                color:
                  activeSubTab === tab.id
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                fontWeight: activeSubTab === tab.id ? '600' : '400',
              }}
            >
              {tab.label}
              {activeSubTab === tab.id && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: 'var(--gold-accent)' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content — kept mounted to preserve scroll/query state */}
      <div className="p-6">
        {TABS.map((tab) => (
          <div key={tab.id} className={activeSubTab === tab.id ? 'block' : 'hidden'}>
            {tab.id === 'about' && <AboutTab artistId={artistId} />}
            {tab.id === 'discography' && (
              <DiscographyTab channelId={artistId} artistName={artist.name} />
            )}
            {tab.id === 'timeline' && <TimelineTab artistName={artist.name} />}
            {tab.id === 'connections' && <ConnectionsTab artistId={artistId} />}
          </div>
        ))}
      </div>
    </div>
  );
}
