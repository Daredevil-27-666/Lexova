import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Sparkles, Eye } from 'lucide-react';

import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { AboutTab }       from '../components/artist-panel/AboutTab';
import { DiscographyTab } from '../components/artist-panel/DiscographyTab';
import { TimelineTab }    from '../components/artist-panel/TimelineTab';
import { ConnectionsTab } from '../components/artist-panel/ConnectionsTab';

import { useArtist }          from '../components/hooks/useArtist';
import { useArtistVideos }    from '../components/hooks/useArtistVideos';
import {
  formatViews,
  formatDuration,
  type RecommendedVideo,
} from '../components/RecommendationsSidebar';

// ─── Local helpers (not shared elsewhere) ─────────────────────────────────────

const formatNumber = (num: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num);

// ─── Tab config (replaces the missing ArtistProfile.data module) ──────────────

const TABS = [
  { id: 'overview',     label: 'Overview'     },
  { id: 'videos',       label: 'Videos'       },
  { id: 'discography',  label: 'Discography'  },
  { id: 'about',        label: 'About'        },
  { id: 'timeline',     label: 'Timeline'     },
  { id: 'connections',  label: 'Connections'  },
] as const;

type TabType = (typeof TABS)[number]['id'];

// ─── VideoCard ────────────────────────────────────────────────────────────────

const VideoCard = ({ video }: { video: RecommendedVideo }) => {
  const navigate = useNavigate();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group cursor-pointer"
      onClick={() => navigate(`/watch/${video.id}`)}
    >
      <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 mb-3">
        <ImageWithFallback
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
          <div className="w-14 h-14 rounded-full bg-[var(--gold-accent)] flex items-center justify-center shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
            <Play className="w-7 h-7 fill-zinc-900 text-zinc-900 ml-1" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white tracking-wider">
          {formatDuration(video.durationSeconds)}
        </div>
      </div>
      <h3 className="font-semibold text-[var(--text-primary)] leading-snug line-clamp-1 group-hover:text-[var(--gold-accent)] transition-colors">
        {video.title}
      </h3>
      <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1">
          <Eye size={12} /> {formatViews(video.viewCount)}
        </span>
      </div>
    </motion.div>
  );
};

// ─── StatBlock ────────────────────────────────────────────────────────────────

const StatBlock = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="text-2xl font-bold text-[var(--gold-accent)] leading-none">
      {formatNumber(value)}
    </div>
    <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] mt-1">
      {label}
    </div>
  </div>
);

// ─── OverviewSection ──────────────────────────────────────────────────────────

const OverviewSection = ({ videos }: { videos: RecommendedVideo[] }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
    <div className="lg:col-span-2 space-y-12">
      {videos[0] && (
        <section>
          <h2 className="text-2xl font-serif font-bold italic mb-6">Featured Video</h2>
          <VideoCard video={videos[0]} />
        </section>
      )}
      {videos.length > 1 && (
        <section>
          <h2 className="text-2xl font-serif font-bold italic mb-6">Popular Performances</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videos.slice(1).map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </section>
      )}
    </div>

    <aside className="space-y-6">
      <h2 className="text-xl font-serif font-bold">More Videos</h2>
      {videos.length > 1 ? (
        videos.slice(1, 5).map((v) => <VideoCard key={v.id} video={v} />)
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">No additional videos.</p>
      )}
    </aside>
  </div>
);

// ─── ArtistProfile ────────────────────────────────────────────────────────────

export function ArtistProfile() {
  // Route is defined as "artist/:id", so the param key is "id"
  const { id: artistId = '' } = useParams();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Hooks must be called unconditionally — before any early returns
  const { data: artist, isLoading: artistLoading, isError: artistError } = useArtist(artistId);
  const { data: videos = [] } = useArtistVideos(artistId);

  if (!artistId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--text-secondary)]">
        No artist selected.
      </div>
    );
  }

  if (artistError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--text-secondary)]">
        Failed to load artist. Check your API key or try again later.
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'discography': return (
        <DiscographyTab channelId={artistId} artistName={artist?.name ?? ''} />
      );
      case 'timeline':    return <TimelineTab artistName={artist?.name ?? ''} />;
      case 'connections': return <ConnectionsTab artistId={artistId} />;
      case 'about':       return <AboutTab       artistId={artistId} />;
      case 'videos':      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {videos.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      );
      default: return <OverviewSection videos={videos} />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-20">
      <header className="relative h-[50vh] min-h-[400px] w-full flex items-end">
        <div className="absolute inset-0 z-0">
          <ImageWithFallback
            src={(artist as any)?.bannerUrl || artist?.avatarUrl || "https://images.unsplash.com/photo-1596826793477-814a59819a7a?auto=format&fit=crop&q=80"}
            alt={artist?.name ?? 'Artist'}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/40 to-transparent" />
        </div>

        <div className="container-custom relative z-10 pb-12 px-6">
          {artist?.isFeatured && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 mb-4 text-[var(--gold-accent)]"
            >
              <Sparkles size={18} />
              <span className="text-xs font-bold tracking-[0.2em] uppercase">
                Featured Artist
              </span>
            </motion.div>
          )}

          <h1 className="text-6xl md:text-8xl font-serif font-semibold tracking-tight mb-6">
            {artistLoading ? '...' : artist?.name}
          </h1>

          {artist && (
            <div className="flex items-center gap-8 border-l border-zinc-800 pl-8">
              <StatBlock
                label="Monthly Listeners"
                value={artist.stats.monthlyListeners}
              />
              <StatBlock
                label="Videos"
                value={artist.stats.videoCount}
              />
            </div>
          )}
        </div>
      </header>

      <nav
        className="sticky top-0 z-50 border-b border-zinc-800"
        style={{ willChange: 'transform', backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="container-custom px-6 overflow-x-auto no-scrollbar">
          <div className="flex items-center h-14" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex-shrink-0 px-6 h-full text-sm font-medium transition-colors relative flex items-center
                  ${activeTab === tab.id
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--gold-accent)]"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="container-custom px-6 py-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}