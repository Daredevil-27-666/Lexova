import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const YT_SCRIPT_SRC = 'https://www.youtube.com/iframe_api';
const EDGE_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;
const HISTORY_KEY = 'library:history:v2';
const authHeaders = { Authorization: `Bearer ${publicAnonKey}` };

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    if (!document.querySelector(`script[src="${YT_SCRIPT_SRC}"]`)) {
      const tag = document.createElement('script');
      tag.src = YT_SCRIPT_SRC;
      document.head.appendChild(tag);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
  });
}

function getYouTubeThumbnail(videoId) {
  // Try maxres first, fall back to hqdefault
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function VideoPlayer({
  videoId = 'M7lc1UVf-VE',
  posterImage,          // custom poster URL — overrides the YT thumbnail
  showPoster = true,    // set false to skip the poster entirely
}) {
  const playerDivRef   = useRef(null);
  const playerRef      = useRef(null);
  const progressBarRef = useRef(null);
  const intervalRef    = useRef(null);
  const userIdRef      = useRef('anon');
  const lastSavedRef   = useRef(0);
  const savingRef      = useRef(false);

  const [isPlaying,        setIsPlaying]        = useState(false);
  const [isReady,          setIsReady]           = useState(false);
  const [hasEverPlayed,    setHasEverPlayed]     = useState(false);
  const [progress,         setProgress]          = useState(0);
  const [currentTime,      setCurrentTime]       = useState(0);
  const [duration,         setDuration]          = useState(0);
  const [volume,           setVolume]            = useState(100);
  const [isMuted,          setIsMuted]           = useState(false);
  const [showVolumeSlider, setShowVolumeSlider]  = useState(false);
  const [posterLoaded,     setPosterLoaded]      = useState(false);
  const [posterError,      setPosterError]       = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      userIdRef.current = data.session?.user?.id ?? 'anon';
    }).catch(() => {
      userIdRef.current = 'anon';
    });
    return () => { cancelled = true; };
  }, []);

  const saveListeningProgress = useCallback(async (progressSeconds: number, totalSeconds: number) => {
    if (!videoId) return;
    if (!totalSeconds || totalSeconds <= 0) return;

    const now = Date.now();
    // throttle writes
    if (now - lastSavedRef.current < 10_000) return;
    if (savingRef.current) return;
    savingRef.current = true;
    lastSavedRef.current = now;

    const key = `${HISTORY_KEY}:${userIdRef.current || 'anon'}`;

    try {
      const getRes = await fetch(`${EDGE_BASE}/kv/${encodeURIComponent(key)}`, { headers: authHeaders });
      const getJson = getRes.ok ? await getRes.json() : { value: null };
      const current: Array<any> = Array.isArray(getJson?.value) ? getJson.value : [];

      const watchedAt = new Date().toISOString();
      const nextItem = {
        id: videoId,
        videoId,
        watchedAt,
        progressSeconds: Math.max(0, Math.floor(progressSeconds)),
        totalSeconds: Math.max(1, Math.floor(totalSeconds)),
      };

      const without = current.filter((v) => v?.videoId !== videoId);
      const next = [nextItem, ...without].slice(0, 50);

      await fetch(`${EDGE_BASE}/kv/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: next }),
      });
    } catch {
      // ignore save failures (offline / blocked / etc.)
    } finally {
      savingRef.current = false;
    }
  }, [videoId]);

  // Determine the poster source
  const posterSrc = posterImage || getYouTubeThumbnail(videoId);
  const shouldShowPoster = showPoster && !hasEverPlayed && !posterError && (posterLoaded || !posterImage);

  // ── Polling ──────────────────────────────────────────────────────────────

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      const cur = p.getCurrentTime();
      const dur = p.getDuration();
      setCurrentTime(cur);
      setDuration(dur);
      if (dur > 0) setProgress((cur / dur) * 100);
      if (dur > 0) saveListeningProgress(cur, dur);
    }, 250);
  }, [saveListeningProgress]);

  const stopPolling = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  // ── YT.Player lifecycle ──────────────────────────────────────────────────

  useEffect(() => {
    let destroyed = false;

    loadYouTubeAPI().then((YT) => {
      if (destroyed || !playerDivRef.current) return;

      playerRef.current = new YT.Player(playerDivRef.current, {
        height: '100%',
        width:  '100%',
        videoId,
        playerVars: {
          playsinline:     1,
          controls:        0,
          modestbranding:  1,
          rel:             0,
          disablekb:       1,
          autoplay:        0,
        },
        events: {
          onReady: () => {
            if (destroyed) return;
            setIsReady(true);
            setVolume(playerRef.current.getVolume());
            setDuration(playerRef.current.getDuration());
          },
          onStateChange: ({ data }) => {
            if (destroyed) return;
            const { PlayerState } = window.YT;

            if (data === PlayerState.PLAYING) {
              setIsPlaying(true);
              setHasEverPlayed(true);
              startPolling();
            } else {
              setIsPlaying(false);
              stopPolling();
              // Save once on pause/buffer/end
              try {
                const cur = playerRef.current?.getCurrentTime?.() ?? 0;
                const dur = playerRef.current?.getDuration?.() ?? 0;
                if (dur > 0) saveListeningProgress(cur, dur);
              } catch { /* ignore */ }

              if (data === PlayerState.ENDED) {
                setProgress(0);
                setCurrentTime(0);
                // Re-show poster when video ends
                setHasEverPlayed(false);
              }
            }
          },
        },
      });
    });

    return () => {
      destroyed = true;
      stopPolling();
      try {
        const cur = playerRef.current?.getCurrentTime?.() ?? 0;
        const dur = playerRef.current?.getDuration?.() ?? 0;
        if (dur > 0) saveListeningProgress(cur, dur);
      } catch { /* ignore */ }
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId, startPolling, stopPolling]);

  // Reset poster state when videoId changes
  useEffect(() => {
    setHasEverPlayed(false);
    setPosterLoaded(false);
    setPosterError(false);
  }, [videoId]);

  // ── Controls ─────────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p || !isReady) return;
    try {
      p.getPlayerState() === window.YT.PlayerState.PLAYING
        ? p.pauseVideo()
        : p.playVideo();
    } catch (err) {
      console.warn('[VideoPlayer] togglePlay blocked:', err);
    }
  }, [isReady]);

  const handlePosterClick = useCallback(() => {
    // First click on poster → start playback
    if (!isReady) return;
    try {
      playerRef.current?.playVideo();
    } catch (err) {
      console.warn('[VideoPlayer] playVideo blocked:', err);
    }
  }, [isReady]);

  const handleProgressClick = useCallback((e) => {
    const p   = playerRef.current;
    const bar = progressBarRef.current;
    if (!p || !bar) return;
    const dur = p.getDuration();
    if (!dur) return;
    const { left, width } = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - left) / width));
    try {
      p.seekTo(ratio * dur, true);
    } catch (err) {
      console.warn('[VideoPlayer] seekTo blocked:', err);
    }
    setProgress(ratio * 100);
    setCurrentTime(ratio * dur);
  }, []);

  const handleVolumeChange = useCallback((e) => {
    const val = Number(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    try {
      playerRef.current?.setVolume(val);
      if (val > 0) playerRef.current?.unMute();
    } catch (err) {
      console.warn('[VideoPlayer] setVolume blocked:', err);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (isMuted) {
        p.unMute();
        setIsMuted(false);
        const restored = volume > 0 ? volume : 50;
        setVolume(restored);
        p.setVolume(restored);
      } else {
        p.mute();
        setIsMuted(true);
      }
    } catch (err) {
      console.warn('[VideoPlayer] mute/unmute blocked:', err);
    }
  }, [isMuted, volume]);

  const handleFullscreen = useCallback(() => {
    const iframe = playerRef.current?.getIframe();
    if (!iframe) return;
    try {
      (iframe.requestFullscreen ?? iframe.webkitRequestFullscreen)?.call(iframe);
    } catch (err) {
      console.warn('[VideoPlayer] Fullscreen not allowed:', err);
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="w-full rounded-lg overflow-hidden relative"
      style={{ backgroundColor: '#000', aspectRatio: '16/9' }}
    >
      {/* YT iframe target */}
      <div ref={playerDivRef} className="absolute inset-0 w-full h-full" />

      {/* ── Poster / Thumbnail Image Overlay ─────────────────────────────── */}
      {shouldShowPoster && (
        <div
          className="absolute inset-0 z-20 transition-opacity duration-500"
          style={{
            opacity: hasEverPlayed ? 0 : 1,
            pointerEvents: hasEverPlayed ? 'none' : 'auto',
          }}
          onClick={handlePosterClick}
        >
          {/* The poster image */}
          <img
            src={posterSrc}
            alt={`Video thumbnail for ${videoId}`}
            onLoad={() => setPosterLoaded(true)}
            onError={() => setPosterError(true)}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />

          {/* Dark scrim for readability */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Gradient fade at bottom (for title area if needed later) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Centre play button — always visible on poster */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center cursor-pointer
                         transition-all duration-200 hover:scale-110 hover:shadow-[0_0_40px_rgba(201,168,76,0.5)]
                         shadow-[0_0_20px_rgba(0,0,0,0.5)]"
              style={{ backgroundColor: 'var(--gold-accent, #c9a84c)' }}
            >
              <Play className="w-9 h-9 text-white fill-current ml-1" />
            </div>
          </div>

          {/* Bottom-left duration badge (mirrors YouTube style) */}
          <div className="absolute bottom-4 right-4">
            <span
              className="px-2 py-0.5 rounded text-xs font-medium text-white"
              style={{
                backgroundColor: 'rgba(0,0,0,0.8)',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {formatTime(duration || 0)}
            </span>
          </div>
        </div>
      )}

      {/* ── Interaction overlay (above iframe, below poster) ─────────────── */}
      <div
        className="absolute inset-0 group cursor-pointer"
        style={{ zIndex: 10 }}
        onClick={togglePlay}
      >
        {/* Hover scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Hover play/pause icon (only when video has started) */}
        {hasEverPlayed && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-150 hover:scale-110 shadow-[0_0_20px_rgba(0,0,0,0.4)]"
              style={{ backgroundColor: 'var(--gold-accent, #c9a84c)' }}
            >
              {isPlaying
                ? <Pause className="w-8 h-8 text-white fill-current" />
                : <Play  className="w-8 h-8 text-white fill-current ml-1" />}
            </div>
          </div>
        )}

        {/* ── Bottom controls bar ───────────────────────────────────────── */}
        <div
          className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ zIndex: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress bar */}
          <div
            ref={progressBarRef}
            onClick={handleProgressClick}
            className="w-full h-1 rounded-full mb-3 cursor-pointer relative group/bar"
            style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
          >
            {/* Buffered hint (optional: left as static demo) */}
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-300"
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                width: `${Math.min(progress + 15, 100)}%`,
              }}
            />
            {/* Played progress */}
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-[50ms]"
              style={{
                backgroundColor: 'var(--gold-accent, #c9a84c)',
                width: `${progress}%`,
              }}
            />
            {/* Hover scrubber thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity duration-150 pointer-events-none"
              style={{
                left: `calc(${progress}% - 7px)`,
                backgroundColor: 'var(--gold-accent, #c9a84c)',
                boxShadow: '0 0 6px rgba(0,0,0,0.4)',
              }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between">

            {/* Left cluster */}
            <div className="flex items-center gap-4">

              <button
                onClick={togglePlay}
                disabled={!isReady}
                className="text-white/90 hover:text-white transition-colors disabled:opacity-40"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying
                  ? <Pause className="w-5 h-5" />
                  : <Play  className="w-5 h-5" />}
              </button>

              {/* Volume */}
              <div
                className="flex items-center gap-2"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <button
                  onClick={toggleMute}
                  className="text-white/90 hover:text-white transition-colors"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0
                    ? <VolumeX className="w-5 h-5" />
                    : <Volume2 className="w-5 h-5" />}
                </button>

                {showVolumeSlider && (
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20"
                    style={{ accentColor: 'var(--gold-accent, #c9a84c)' }}
                    aria-label="Volume"
                  />
                )}
              </div>

              <span
                className="text-white/90 text-sm tabular-nums"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-4">
              <button
                className="text-white/90 hover:text-white transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleFullscreen}
                className="text-white/90 hover:text-white transition-colors"
                aria-label="Fullscreen"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}