import { useState } from 'react';
import { ArrowRight, SkipBack, Play, SkipForward } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const BG_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBqcpuqvNoQ3PaIxgolDKdLR1kjFaDPhsNiB4xUwj7v_43K1HpRH4gJ0eR0eMGkYhaVFIIaxRTPVPNEoYFLiNyZekAUZdjEcFGMVwck6Ag0tSlYNTrT3gQM23JFYKOlCc3bqxsGmzLp0R6Lgg0uoq2k3Agt98jqCouhR2IS8_DFTVxUVJoFwLluCxjH2M4kt8MAUklGN9M-woOF3khHsGdxuUIkUPEY1MSaSNNHmqFV2KowKd1bWyh6LVfWxmbDxCiwIxCd8cq2N-Pz';

const ALBUM_ART =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDRX9VslNPmexPJIacQgeVDvhRr91to-IGHtm7srS33xg-I0STaUuM8Aue7TRZ7bjnVHiM4Z9M9xguYJ-hNip-ywbQ_q9mgI98MW5tvBsY4OxFD3x2oQU1ak2FH7Lpg61fbF76B0lLtLe2AEXGMNsrI74BWb_THgST7DtK0NyupIouL9juNr9djaEin-YEXkmDdjAo6KPK_dd7RRqmWXRQK1mKcZE0e5oDvi2QNM_cz2tYpUSxDme4Sy3SSylKbnnpKbrS39x5VXKfo';

export function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ backgroundColor: '#131314', minHeight: 'max(884px, 100dvh)' }}
    >
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={BG_IMAGE}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#131314] via-[#131314]/60 to-transparent" />
      </div>

      {/* Centre content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-8 w-full max-w-4xl">
        <h1
          className="font-['Playfair_Display'] uppercase tracking-widest mb-4"
          style={{ fontSize: 'clamp(3rem,8vw,5rem)', fontWeight: 700, color: '#3B82F6', lineHeight: 1.1 }}
        >
          Lexova
        </h1>

        <p
          className="font-['DM_Sans'] font-light max-w-md mx-auto mb-16"
          style={{ fontSize: '1.125rem', lineHeight: 1.6, color: '#9E9581' }}
        >
          The Discerning Curator
        </p>

        {error && (
          <div
            className="mb-6 px-4 py-3 rounded-lg text-sm font-['DM_Sans'] w-full max-w-xs"
            style={{
              backgroundColor: 'rgba(239,68,68,0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-4 rounded-full font-['DM_Sans'] font-semibold transition-all hover:brightness-110 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{
            backgroundColor: '#3B82F6',
            color: '#fff',
            fontSize: '0.875rem',
            letterSpacing: '0.05em',
            boxShadow: '0 0 40px 5px rgba(59,130,246,0.15)',
          }}
        >
          {loading ? 'Signing in…' : 'Start your journey'}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Now Playing strip */}
      <div
        className="fixed bottom-0 w-full z-40 px-6 py-4 flex items-center justify-between"
        style={{
          background: 'rgba(20,20,20,0.4)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -4px 20px rgba(59,130,246,0.05)',
        }}
      >
        {/* Track info */}
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded overflow-hidden flex-shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <img src={ALBUM_ART} alt="Album art" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="font-['DM_Sans'] text-xs font-medium" style={{ color: '#E8E0D4' }}>
              Midnight Sessions
            </span>
            <span className="font-['DM_Sans'] text-xs" style={{ color: '#9E9581' }}>
              The Alchemist
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button
            aria-label="Previous"
            className="transition-colors"
            style={{ color: '#9E9581' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#3B82F6')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9E9581')}
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            aria-label="Play"
            className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
            style={{
              backgroundColor: '#1c1b1c',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#3B82F6',
            }}
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </button>
          <button
            aria-label="Next"
            className="transition-colors"
            style={{ color: '#9E9581' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#3B82F6')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9E9581')}
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 w-full h-[2px]" style={{ backgroundColor: '#201f20' }}>
          <div className="h-full w-1/3" style={{ backgroundColor: '#3B82F6' }} />
        </div>
      </div>
    </div>
  );
}
