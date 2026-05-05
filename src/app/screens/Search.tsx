import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Search as SearchIcon, X, Music, Loader2, AlertCircle,
  Clock, TrendingUp, Play,
  MapPin, Calendar, ExternalLink, Mic2, Users, Radio, Sparkles,
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { genai, GEMINI_MODEL } from '../../lib/gemini';

// ─── MusicBrainz Types ────────────────────────────────────────────────────────

interface MbTag {
  name: string;
  count: number;
}

interface MbLifeSpan {
  begin?: string;
  end?: string;
  ended?: boolean;
}

interface MbArea {
  name: string;
}

interface MbArtist {
  id: string;
  name: string;
  type?: string;
  country?: string;
  disambiguation?: string;
  tags?: MbTag[];
  'life-span'?: MbLifeSpan;
  area?: MbArea;
  score?: number;
  imageUrl?: string;
}

// ─── MusicBrainz Helper ───────────────────────────────────────────────────────

// FIX: Removed the mangled `export function Search(const [...] = useState...)` block
// that was accidentally embedded inside this function — it was a broken manual merge.
// FIX: Restored the `artist:` field qualifier so MB searches artists specifically,
// not every entity type. Quoting the full query without the field was less accurate.
async function searchMusicBrainzArtist(query: string): Promise<MbArtist | null> {
  try {
    const url =
      `https://musicbrainz.org/ws/2/artist/` +
      `?query=artist:${encodeURIComponent(query)}` +
      `&fmt=json&limit=1`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Lexova-Prototype/1.2.0 (hello@lexova.app)' },
    });

    if (!res.ok) {
      console.error('MusicBrainz API failed with status:', res.status);
      return null;
    }

    const data = await res.json();
    const artist: MbArtist | undefined = data.artists?.[0];

    console.log('MusicBrainz Result -> Name:', artist?.name, '| Score:', artist?.score);

    // Only surface the card when MB is highly confident it's an artist match.
    // Score below 85 usually means the query was a phrase, not an artist name.
    if (!artist || (artist.score ?? 0) < 85) return null;

    return artist;
  } catch (err) {
    console.error('MusicBrainz Fetch Error:', err);
    return null;
  }
}

async function fetchArtistImage(mbid: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels&fmt=json`,
      { headers: { 'User-Agent': 'Lexova-Prototype/1.2.0 (hello@lexova.app)' } },
    );
    if (!res.ok) return null;
    const data = await res.json();

    const wikiRel = (data.relations ?? []).find(
      (r: any) => r.type === 'wikipedia' && r.url?.resource?.includes('en.wikipedia.org'),
    );
    if (!wikiRel) return null;

    const title = decodeURIComponent((wikiRel.url.resource as string).split('/wiki/')[1] ?? '');
    if (!title) return null;

    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    );
    if (!summaryRes.ok) return null;
    const summary = await summaryRes.json();
    return (summary.thumbnail?.source as string) ?? null;
  } catch {
    return null;
  }
}

// ─── Country Flag Helper ──────────────────────────────────────────────────────

function countryFlag(code?: string): string {
  if (!code || code.length !== 2) return '';
  return [...code.toUpperCase()]
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('');
}

// ─── Gemini Insight ───────────────────────────────────────────────────────────

interface GeminiInsight {
  insight: string;
  news: string[];
}

async function fetchGeminiInsight(artistName: string): Promise<GeminiInsight | null> {
  try {
    const response = await genai.models.generateContent({
      model: GEMINI_MODEL,
      config: { responseMimeType: 'application/json' },
      contents: `You are a music encyclopedia. For the artist "${artistName}", return a JSON object with exactly these keys:
- "insight": string — 2 sentences covering musical style, biggest achievements, and current career status.
- "news": string[] — exactly 3 short strings, each a recent notable fact or milestone (under 15 words each).
Example: {"insight": "...", "news": ["...", "...", "..."]}`,
    });
    const text = response.text ?? '';
    if (!text) { console.warn('[Gemini] empty response for:', artistName); return null; }
    const data = JSON.parse(text) as GeminiInsight;
    if (typeof data.insight !== 'string' || !Array.isArray(data.news)) {
      console.warn('[Gemini] unexpected shape:', data);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[Gemini] error:', err);
    return null;
  }
}

// ─── AI Overview ─────────────────────────────────────────────────────────────

function AIOverview({ insight, loading, artistName }: { insight: GeminiInsight | null; loading: boolean; artistName: string }) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  return (
    <div
      className="mb-8 rounded-2xl"
      style={{ backgroundColor: '#111', border: '1px solid #222' }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
          >
            <Sparkles className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-['DM_Sans'] font-bold text-base" style={{ color: '#E8E0D4' }}>
            AI Overview
          </span>
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 rounded w-full"      style={{ backgroundColor: '#1c1c1c' }} />
            <div className="h-4 rounded w-[90%]"     style={{ backgroundColor: '#1a1a1a' }} />
            <div className="h-4 rounded w-[80%]"     style={{ backgroundColor: '#191919' }} />
            <div className="h-4 rounded w-[75%]"     style={{ backgroundColor: '#181818' }} />
            <div className="mt-4 h-3 rounded w-28"   style={{ backgroundColor: '#1e1e1e' }} />
            <div className="h-3 rounded w-[60%]"     style={{ backgroundColor: '#1c1c1c' }} />
            <div className="h-3 rounded w-[55%]"     style={{ backgroundColor: '#1a1a1a' }} />
          </div>
        ) : insight ? (
          <>
            {/* Main insight body */}
            <p className="font-['DM_Sans'] text-[15px] leading-[1.75]" style={{ color: '#E8E0D4' }}>
              {insight.insight}
            </p>

            {/* Latest news */}
            {insight?.news?.length > 0 && (
              <div className="mt-5">
                <p className="font-['DM_Sans'] text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ color: '#38BDF8' }}>
                  Latest News
                </p>
                <div className="pl-3.5" style={{ borderLeft: '2.5px solid #1D4ED8' }}>
                  <p className="font-['DM_Sans'] text-sm italic leading-relaxed" style={{ color: '#9ca3af' }}>
                    {insight.news.join(' ')}
                  </p>
                </div>
              </div>
            )}

            {/* Sources + accuracy feedback */}
            <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-['DM_Sans'] text-xs" style={{ color: '#555' }}>Sources:</span>
                {['Wikipedia', 'Rolling Stone', 'Billboard'].map((src, i) => (
                  <span key={src}>
                    <span className="font-['DM_Sans'] text-xs underline cursor-default" style={{ color: '#6b7280' }}>{src}</span>
                    {i < 2 && <span style={{ color: '#333' }}> · </span>}
                  </span>
                ))}
                <span className="font-['DM_Sans'] text-xs ml-1" style={{ color: '#374151' }}>· About {artistName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-['DM_Sans'] text-xs" style={{ color: '#555' }}>Accurate?</span>
                <button
                  onClick={() => setFeedback(f => f === 'up' ? null : 'up')}
                  className="text-base transition-transform hover:scale-125"
                  style={{ opacity: feedback === 'down' ? 0.35 : 1 }}
                  aria-label="Thumbs up"
                >👍</button>
                <button
                  onClick={() => setFeedback(f => f === 'down' ? null : 'down')}
                  className="text-base transition-transform hover:scale-125"
                  style={{ opacity: feedback === 'up' ? 0.35 : 1 }}
                  aria-label="Thumbs down"
                >👎</button>
              </div>
            </div>
          </>
        ) : (
          // ✅ FIX: handle empty state (this was missing)
          <p className="font-['DM_Sans'] text-sm" style={{ color: '#6b7280' }}>
            No AI insights available.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── ArtistCard ───────────────────────────────────────────────────────────────

function ArtistTypeIcon({ type }: { type?: string }) {
  const t = type?.toLowerCase();
  if (t === 'group' || t === 'orchestra' || t === 'choir') return <Users className="w-3.5 h-3.5" />;
  if (t === 'person') return <Mic2 className="w-3.5 h-3.5" />;
  return <Radio className="w-3.5 h-3.5" />;
}

function ArtistCard({ artist }: { artist: MbArtist }) {
  const lifeSpan = artist['life-span'];

  const activeYears = (() => {
    if (!lifeSpan?.begin) return null;
    const beginYear = lifeSpan.begin.split('-')[0];
    if (lifeSpan.ended && lifeSpan.end) return `${beginYear} – ${lifeSpan.end.split('-')[0]}`;
    return `${beginYear} – present`;
  })();

  const topTags = (artist.tags ?? [])
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div
      className="mb-4 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f1a2e 0%, #111 60%, #0D0D0D 100%)',
        border: '1px solid #1e3a5f',
        boxShadow: '0 0 40px rgba(59,130,246,0.06)',
      }}
    >
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, #3B82F6, transparent)' }} />
      <div className="p-6 flex flex-col sm:flex-row gap-5 items-start">
        <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden" style={{ border: '1px solid #2a4a7f' }}>
          {artist.imageUrl ? (
            <img src={artist.imageUrl} alt={artist.name} className="w-full h-full object-cover object-top" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-['Playfair_Display'] font-bold" style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2040)', color: '#60a5fa' }}>
              {artist.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-['Playfair_Display'] font-bold text-xl" style={{ color: '#E8E0D4' }}>{artist.name}</h3>
            {artist.type && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-['DM_Sans'] font-medium" style={{ backgroundColor: '#1e3a5f', color: '#60a5fa', border: '1px solid #2a4a7f' }}>
                <ArtistTypeIcon type={artist.type} />{artist.type}
              </span>
            )}
          </div>
          {artist.disambiguation && <p className="font-['DM_Sans'] text-sm mb-3" style={{ color: '#6b7280' }}>{artist.disambiguation}</p>}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {(artist.country || artist.area?.name) && (
              <span className="flex items-center gap-1.5 font-['DM_Sans'] text-xs" style={{ color: '#9ca3af' }}>
                <MapPin className="w-3 h-3" style={{ color: '#6b7280' }} />
                {countryFlag(artist.country)} {artist.area?.name ?? artist.country}
              </span>
            )}
            {activeYears && (
              <span className="flex items-center gap-1.5 font-['DM_Sans'] text-xs" style={{ color: '#9ca3af' }}>
                <Calendar className="w-3 h-3" style={{ color: '#6b7280' }} />{activeYears}
              </span>
            )}
          </div>
          {topTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {topTags.map(tag => (
                <span key={tag.name} className="px-2.5 py-1 rounded-full font-['DM_Sans'] text-xs capitalize" style={{ backgroundColor: 'rgba(59,130,246,0.08)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}>
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-['DM_Sans'] text-[10px] font-mono select-all" style={{ color: '#374151' }}>MBID: {artist.id}</span>
            <a href={`https://musicbrainz.org/artist/${artist.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-['DM_Sans'] text-xs transition-colors hover:text-blue-300" style={{ color: '#6b7280' }}>
              View on MusicBrainz <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App Types ────────────────────────────────────────────────────────────────

interface VideoResult {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  publishedAt: string;
  description: string;
}

interface SearchResponse {
  videos: VideoResult[];
  nextPageToken: string | null;
  totalResults: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;

const TRENDING_QUERIES = [
  'Kendrick Lamar', 'Taylor Swift', 'Bad Bunny', 'Sabrina Carpenter',
  'Beyoncé', 'The Weeknd', 'Olivia Rodrigo', 'Tyler the Creator',
];

const MUSIC_GENRES = [
  { label: 'Hip-Hop',    color: '#8B5CF6' },
  { label: 'Pop',        color: '#EC4899' },
  { label: 'R&B',        color: '#F59E0B' },
  { label: 'Electronic', color: '#3B82F6' },
  { label: 'Rock',       color: '#EF4444' },
  { label: 'Jazz',       color: '#10B981' },
  { label: 'Classical',  color: '#6366F1' },
  { label: 'Latin',      color: '#F97316' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPublishedDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 1)   return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)   return `${diffDays}d ago`;
  if (diffDays < 30)  return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

// ─── VideoCard ────────────────────────────────────────────────────────────────

function VideoCard({ video, onClick }: { video: VideoResult; onClick: () => void }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError,  setImgError]  = useState(false);

  return (
    <div onClick={onClick} className="group cursor-pointer flex flex-col gap-3" role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <div className="relative w-full aspect-video rounded-xl overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: '#1a1a1a' }}>
            <Music className="w-8 h-8" style={{ color: '#333' }} />
          </div>
        )}
        {!imgError ? (
          <img
            src={video.thumbnail} alt={video.title}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgError(true); setImgLoaded(true); }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: '#1a1a1a' }}>
            <Music className="w-8 h-8" style={{ color: '#333' }} />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(59,130,246,0.9)' }}>
            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-['DM_Sans'] font-semibold text-sm leading-snug line-clamp-2 group-hover:text-blue-400 transition-colors" style={{ color: '#E8E0D4' }}>{video.title}</h3>
          <p className="font-['DM_Sans'] text-xs mt-1" style={{ color: '#888' }}>{video.channel}</p>
          <p className="font-['DM_Sans'] text-xs mt-0.5" style={{ color: '#555' }}>{formatPublishedDate(video.publishedAt)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── VideoListItem ────────────────────────────────────────────────────────────

function VideoListItem({ video, onClick }: { video: VideoResult; onClick: () => void }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError,  setImgError]  = useState(false);

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer flex gap-4 p-3 rounded-xl transition-colors"
      style={{ backgroundColor: 'transparent' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#161616')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="relative flex-shrink-0 w-40 aspect-video rounded-lg overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Music className="w-5 h-5" style={{ color: '#333' }} />
          </div>
        )}
        {!imgError ? (
          <img
            src={video.thumbnail} alt={video.title}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgError(true); setImgLoaded(true); }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Music className="w-5 h-5" style={{ color: '#333' }} />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Play className="w-4 h-4 fill-white text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0 py-1">
        <h3 className="font-['DM_Sans'] font-semibold text-sm leading-snug line-clamp-2 group-hover:text-blue-400 transition-colors" style={{ color: '#E8E0D4' }}>{video.title}</h3>
        <p className="font-['DM_Sans'] text-xs mt-1" style={{ color: '#888' }}>{video.channel}</p>
        <p className="font-['DM_Sans'] text-xs mt-0.5 line-clamp-2" style={{ color: '#555' }}>{video.description}</p>
        <p className="font-['DM_Sans'] text-xs mt-1" style={{ color: '#444' }}>{formatPublishedDate(video.publishedAt)}</p>
      </div>
    </div>
  );
}

// ─── Search Page ──────────────────────────────────────────────────────────────

export function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  // ── Existing state ─────────────────────────────────────────────────────────
  const [inputValue,     setInputValue]     = useState(initialQuery);
  const [activeQuery,    setActiveQuery]    = useState(initialQuery);
  const [videos,         setVideos]         = useState<VideoResult[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [loadingMore,    setLoadingMore]    = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [nextPageToken,  setNextPageToken]  = useState<string | null>(null);
  const [totalResults,   setTotalResults]   = useState(0);
  const [viewMode,       setViewMode]       = useState<'grid' | 'list'>('grid');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('lexova_recent_searches') || '[]'); }
    catch { return []; }
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef    = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── MusicBrainz state ──────────────────────────────────────────────────────
  const [officialArtist, setOfficialArtist] = useState<MbArtist | null>(null);
  const [mbLoading,      setMbLoading]      = useState(false);

  // ── Gemini insight state ────────────────────────────────────────────────────
  const [geminiInsight,        setGeminiInsight]        = useState<GeminiInsight | null>(null);
  const [geminiInsightLoading, setGeminiInsightLoading] = useState(false);
  const [geminiStarted,        setGeminiStarted]        = useState(false);

  // ── Gemini fires on every search, completely independent of MusicBrainz ─────
  useEffect(() => {
    setGeminiInsight(null);
    setGeminiStarted(false);
    if (!activeQuery.trim()) { setGeminiInsightLoading(false); return; }

    setGeminiStarted(true);
    setGeminiInsightLoading(true);
    fetchGeminiInsight(activeQuery)
      .then(setGeminiInsight)
      .finally(() => setGeminiInsightLoading(false));
  }, [activeQuery]);

  // ── MusicBrainz effect — fires separately, only populates artist card ──────
  useEffect(() => {
    setOfficialArtist(null);
    if (!activeQuery.trim()) return;

    setMbLoading(true);
    searchMusicBrainzArtist(activeQuery)
      .then(async (artist) => {
        if (!artist) return;
        const imageUrl = await fetchArtistImage(artist.id);
        setOfficialArtist({ ...artist, imageUrl: imageUrl ?? undefined });
      })
      .finally(() => setMbLoading(false));
  }, [activeQuery]);

  // ── Existing callbacks ─────────────────────────────────────────────────────
  const saveRecentSearch = useCallback((query: string) => {
    setRecentSearches(prev => {
      const updated = [query, ...prev.filter(q => q !== query)].slice(0, 8);
      localStorage.setItem('lexova_recent_searches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecentSearch = useCallback((query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(q => q !== query);
      localStorage.setItem('lexova_recent_searches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const doSearch = useCallback(async (query: string, token?: string) => {
    if (!query.trim()) return;
    const isLoadMore = !!token;
    if (isLoadMore) setLoadingMore(true);
    else { setLoading(true); setVideos([]); setNextPageToken(null); }
    setError(null);

    try {
      const params = new URLSearchParams({ q: query, maxResults: '20' });
      if (token) params.set('pageToken', token);

      const res = await fetch(`${SERVER_BASE}/youtube/search?${params}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const data: SearchResponse & { error?: string } = await res.json();

      if (!res.ok || data.error) throw new Error(data.error || 'Search failed');

      if (isLoadMore) {
        setVideos(prev => {
          const existingIds = new Set(prev.map(v => v.id));
          const incoming = data.videos.filter(v => !existingIds.has(v.id));
          return [...prev, ...incoming];
        });
      } else {
        // Deduplicate the initial page too (API occasionally returns dupes)
        const seen = new Set<string>();
        const unique = data.videos.filter(v => {
          if (seen.has(v.id)) return false;
          seen.add(v.id);
          return true;
        });
        setVideos(unique);
        setTotalResults(data.totalResults);
      }
      setNextPageToken(data.nextPageToken);
    } catch (err: any) {
      console.error('YouTube search error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      if (isLoadMore) setLoadingMore(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeQuery.trim()) doSearch(activeQuery);
    else { setVideos([]); setError(null); }
  }, [activeQuery, doSearch]);

  useEffect(() => {
    if (initialQuery) setActiveQuery(initialQuery);
  }, []);

  // Infinite scroll — fire load-more when sentinel scrolls into view
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && nextPageToken && !loadingMore && !loading) {
          doSearch(activeQuery, nextPageToken);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextPageToken, loadingMore, loading, activeQuery, doSearch]);

  const handleSubmit = (query: string) => {
    const q = query.trim();
    if (!q) return;
    setShowSuggestions(false);
    setActiveQuery(q);
    setInputValue(q);
    setSearchParams({ q });
    saveRecentSearch(q);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter')  handleSubmit(inputValue);
    if (e.key === 'Escape') { setShowSuggestions(false); inputRef.current?.blur(); }
  };

  const clearInput = () => {
    setInputValue('');
    setActiveQuery('');
    setVideos([]);
    setError(null);
    setSearchParams({});
    setShowSuggestions(false);
    setOfficialArtist(null);
    setGeminiInsight(null);
    setGeminiStarted(false);
    inputRef.current?.focus();
  };

  const showEmpty   = !activeQuery && videos.length === 0 && !loading;
  const showResults = videos.length > 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0D0D0D' }}>

      {/* Header */}
      <div className="sticky top-0 z-20 px-8 py-5 border-b" style={{ backgroundColor: '#0D0D0D', borderColor: '#1a1a1a' }}>
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all"
              style={{
                backgroundColor: '#111',
                borderColor: showSuggestions ? '#3B82F6' : '#222',
                boxShadow:   showSuggestions ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
              }}
            >
              <SearchIcon className="w-5 h-5 flex-shrink-0" style={{ color: '#666' }} />
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Search for music, artists, albums..."
                className="flex-1 bg-transparent outline-none font-['DM_Sans'] text-base placeholder:opacity-40"
                style={{ color: '#E8E0D4' }}
                autoComplete="off"
                spellCheck={false}
              />
              {/* FIX: spinner now reflects both loading states */}
              {(loading || mbLoading) && (
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: '#3B82F6' }} />
              )}
              {inputValue && !loading && !mbLoading && (
                <button onClick={clearInput} className="flex-shrink-0 p-0.5 rounded-full transition-colors hover:bg-white/10">
                  <X className="w-4 h-4" style={{ color: '#666' }} />
                </button>
              )}
              <button
                onClick={() => handleSubmit(inputValue)}
                className="flex-shrink-0 px-4 py-1.5 rounded-xl font-['DM_Sans'] text-sm font-medium transition-colors"
                style={{ backgroundColor: '#3B82F6', color: '#fff' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3B82F6')}
              >
                Search
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && !activeQuery && (
              <div
                className="absolute top-full left-0 right-0 mt-2 rounded-2xl border overflow-hidden z-50"
                style={{ backgroundColor: '#111', borderColor: '#222', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
              >
                {recentSearches.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-2 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" style={{ color: '#555' }} />
                      <span className="font-['DM_Sans'] text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>Recent</span>
                    </div>
                    {recentSearches.map((q) => (
                      <button
                        key={q}
                        onMouseDown={() => handleSubmit(q)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors group"
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1a1a1a')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <div className="flex items-center gap-2.5">
                          <Clock className="w-4 h-4" style={{ color: '#444' }} />
                          <span className="font-['DM_Sans'] text-sm" style={{ color: '#E8E0D4' }}>{q}</span>
                        </div>
                        <div
                          role="button" tabIndex={0}
                          onMouseDown={(e) => clearRecentSearch(q, e)}
                          onKeyDown={(e) => e.key === 'Enter' && clearRecentSearch(q, e as any)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-white/10"
                        >
                          <X className="w-3 h-3" style={{ color: '#666' }} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="p-2 border-t" style={{ borderColor: '#1a1a1a' }}>
                  <div className="px-3 py-2 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: '#555' }} />
                    <span className="font-['DM_Sans'] text-xs font-medium uppercase tracking-wider" style={{ color: '#555' }}>Trending</span>
                  </div>
                  {TRENDING_QUERIES.map((q) => (
                    <button
                      key={q}
                      onMouseDown={() => handleSubmit(q)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors"
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1a1a1a')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <TrendingUp className="w-4 h-4" style={{ color: '#3B82F6' }} />
                      <span className="font-['DM_Sans'] text-sm" style={{ color: '#E8E0D4' }}>{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6 max-w-7xl mx-auto">

        {/* Empty State */}
        {showEmpty && (
          <div>
            <div className="mb-10">
              <h2 className="font-['Playfair_Display'] text-xl mb-4" style={{ color: '#E8E0D4' }}>Browse by Genre</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {MUSIC_GENRES.map((genre) => (
                  <button
                    key={genre.label}
                    onClick={() => handleSubmit(genre.label + ' music')}
                    className="relative h-24 rounded-2xl overflow-hidden flex items-end p-4 text-left transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: genre.color + '22', border: `1px solid ${genre.color}44` }}
                  >
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full opacity-30" style={{ backgroundColor: genre.color }} />
                    <div className="absolute top-1 right-1 w-16 h-16 rounded-full opacity-10" style={{ backgroundColor: genre.color }} />
                    <span className="font-['DM_Sans'] font-bold text-base relative z-10" style={{ color: genre.color }}>{genre.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-['Playfair_Display'] text-xl mb-4" style={{ color: '#E8E0D4' }}>Trending Now</h2>
              <div className="flex flex-wrap gap-2">
                {TRENDING_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSubmit(q)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border font-['DM_Sans'] text-sm transition-all hover:border-blue-500 hover:text-blue-400"
                    style={{ borderColor: '#222', color: '#888', backgroundColor: '#111' }}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 flex items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#3B82F6' }} />
            </div>
            <p className="font-['DM_Sans'] text-sm" style={{ color: '#666' }}>
              Searching for <span style={{ color: '#E8E0D4' }}>"{activeQuery}"</span>...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1a0000' }}>
              <AlertCircle className="w-7 h-7" style={{ color: '#EF4444' }} />
            </div>
            <div className="text-center">
              <p className="font-['DM_Sans'] font-semibold" style={{ color: '#E8E0D4' }}>Search Failed</p>
              <p className="font-['DM_Sans'] text-sm mt-1 max-w-md" style={{ color: '#666' }}>{error}</p>
            </div>
            <button
              onClick={() => doSearch(activeQuery)}
              className="px-5 py-2.5 rounded-xl font-['DM_Sans'] text-sm font-medium transition-colors"
              style={{ backgroundColor: '#3B82F6', color: '#fff' }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Results header — shows as soon as we have a query + videos ─────── */}
        {showResults && !loading && (
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-['Playfair_Display'] text-2xl" style={{ color: '#E8E0D4' }}>
                Results for <span style={{ color: '#3B82F6' }}>"{activeQuery}"</span>
              </h2>
              <p className="font-['DM_Sans'] text-sm mt-0.5" style={{ color: '#555' }}>
                {totalResults.toLocaleString()} videos found
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: '#111', border: '1px solid #222' }}>
              <button
                onClick={() => setViewMode('grid')}
                className="px-3 py-1.5 rounded-lg font-['DM_Sans'] text-xs font-medium transition-colors"
                style={{ backgroundColor: viewMode === 'grid' ? '#222' : 'transparent', color: viewMode === 'grid' ? '#E8E0D4' : '#555' }}
              >Grid</button>
              <button
                onClick={() => setViewMode('list')}
                className="px-3 py-1.5 rounded-lg font-['DM_Sans'] text-xs font-medium transition-colors"
                style={{ backgroundColor: viewMode === 'list' ? '#222' : 'transparent', color: viewMode === 'list' ? '#E8E0D4' : '#555' }}
              >List</button>
            </div>
          </div>
        )}

        {/* ── MusicBrainz Artist Card — independent of Gemini ──────────────── */}
        {activeQuery && mbLoading && (
          <div className="mb-6 rounded-2xl p-6 animate-pulse" style={{ backgroundColor: '#111', border: '1px solid #1e3a5f' }}>
            <div className="flex gap-5 items-start">
              <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: '#1a2a3a' }} />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-48 rounded" style={{ backgroundColor: '#1a2a3a' }} />
                <div className="h-3 w-64 rounded" style={{ backgroundColor: '#151f2a' }} />
                <div className="flex gap-2">
                  {[80, 60, 70].map(w => (
                    <div key={w} className="h-6 rounded-full" style={{ width: w, backgroundColor: '#151f2a' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {!mbLoading && officialArtist && <ArtistCard artist={officialArtist} />}

        {/* ── AI Overview — shows for any search, stays visible even on error ── */}
        {geminiStarted && (
          <AIOverview
            insight={geminiInsight}
            loading={geminiInsightLoading}
            artistName={officialArtist?.name ?? activeQuery}
          />
        )}

        {/* Results */}
        {showResults && !loading && (
          <div>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {videos.map((video) => (
                  <VideoCard key={video.id} video={video} onClick={() => navigate(`/watch/${video.id}`)} />
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="flex flex-col gap-1">
                {videos.map((video) => (
                  <VideoListItem key={video.id} video={video} onClick={() => navigate(`/watch/${video.id}`)} />
                ))}
              </div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />
            {loadingMore && (
              <div className="flex justify-center mt-6 mb-4">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#3B82F6' }} />
              </div>
            )}
            {!nextPageToken && videos.length > 0 && (
              <div className="flex justify-center mt-10">
                <p className="font-['DM_Sans'] text-sm" style={{ color: '#444' }}>You've reached the end of the results</p>
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && activeQuery && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#111' }}>
              <SearchIcon className="w-7 h-7" style={{ color: '#444' }} />
            </div>
            <div className="text-center">
              <p className="font-['DM_Sans'] font-semibold text-lg" style={{ color: '#E8E0D4' }}>No results found</p>
              <p className="font-['DM_Sans'] text-sm mt-1" style={{ color: '#666' }}>
                We couldn't find anything for "{activeQuery}". Try different keywords.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {TRENDING_QUERIES.slice(0, 4).map((q) => (
                <button
                  key={q}
                  onClick={() => handleSubmit(q)}
                  className="px-4 py-2 rounded-full border font-['DM_Sans'] text-sm transition-all hover:border-blue-500 hover:text-blue-400"
                  style={{ borderColor: '#222', color: '#888', backgroundColor: '#111' }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}