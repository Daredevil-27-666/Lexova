import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── images from Stitch design ───────────────────────────────────────────────
const IMG_VINYL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBqcpuqvNoQ3PaIxgolDKdLR1kjFaDPhsNiB4xUwj7v_43K1HpRH4gJ0eR0eMGkYhaVFIIaxRTPVPNEoYFLiNyZekAUZdjEcFGMVwck6Ag0tSlYNTrT3gQM23JFYKOlCc3bqxsGmzLp0R6Lgg0uoq2k3Agt98jqCouhR2IS8_DFTVxUVJoFwLluCxjH2M4kt8MAUklGN9M-woOF3khHsGdxuUIkUPEY1MSaSNNHmqFV2KowKd1bWyh6LVfWxmbDxCiwIxCd8cq2N-Pz';
const IMG_ARTIST =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBm_i3joZrIvkHwm_4LPiamu52weXj7bTVLrOstV-KZNbz6RMEQn3ek0ufIaTXIzmwAaWBkIF4SiikVK2SD9NhGKqscb0RX8UT1yZCfhHOP2smLtOUL9WTi1qZwuf1WsVZCajkrz-brrJdBDoHqvdK-Kc9TVUNjgxC2j2AGlEK6HpCkpsecYi_XVsy2BtR7H6ZuofhKspeGLOQW9-8U3XSrC6Bu1h4wgOx2D-75TDP8qKpuuA16oeir_vALVsKcnHk8sGM1XhGEg1Rw';
const IMG_HOOK =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCwXX7ulADk3lYS_IdqvB3iVaCr7rdL0AaupGYCWDhAbsr6Bog0rR0ycc602pvJTM4E46xqpSBNwzvYaJI_V2URW5t7j5i36Oj8sImYuyThFmGQPAm5vIgQDhJ_2q1uqfYm29lMoRYAhycamT4qpeX4SkrE0Hw3tdqFRyVc68b5ngyvUWdxMLn_GDiQVordz0BYeh6KLvWr_zbwHtdZfq4LohenviLVikAsurI90u7QU58vgq92VZXlMaaVLn4SgTEtoJT7sqRYw74A';
const IMG_ALBUM =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCqGhSR7ePLFi75hj3Cw-vrQpbWO2sMsDd4IOd-yo-YKoy_m9t1ZblVw7EkLtCt9019PUItzI6NAqXTRqUQLxL-mCngI_kDKHdf5PotbEi8RewOgbMGUXQ-pFHYudH3zE1cE2BhB1dTggQF0InqlzErKxNbNUmxEgB_PHHyThl48OP3pc-IEc1YJ-bEx-nySdgXTny415DiegZLRHBpbetkD0H_Onkj6gqdyuJgkeXaZtIOKFzaQLgTNHYz2_offvbnYsfrVIOkQ9bP';
const IMG_THUMB_1 =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCoY8M4KQXWkOPEzuix6jK49MuEf6VrzuWQZVXGSb9LNguqbztjJ9jbGYBAKIUkdlGBXl46zyTIdg8gRCsRPzdUYTcHrWHBLb2C6LHVWbdwCKwZkToKKtX9noPlYfQX4ZoNuBzA5U0UbenoW_XfoDXT1VwC1f5vO4rGRR8AJVqYVdBpZ7Kwibh5bDGg_ygol-Sk-k4IVLHUYjO4yO_AlvCKvGzEKhpyM90DTJ7WPikIxs4kfRZshDJmoJeJJuxiFgf3Y8oGzwjyF-sM';
const IMG_ALBUM_MINI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDRX9VslNPmexPJIacQgeVDvhRr91to-IGHtm7srS33xg-I0STaUuM8Aue7TRZ7bjnVHiM4Z9M9xguYJ-hNip-ywbQ_q9mgI98MW5tvBsY4OxFD3x2oQU1ak2FH7Lpg61fbF76B0lLtLe2AEXGMNsrI74BWb_THgST7DtK0NyupIouL9juNr9djaEin-YEXkmDdjAo6KPK_dd7RRqmWXRQK1mKcZE0e5oDvi2QNM_cz2tYpUSxDme4Sy3SSylKbnnpKbrS39x5VXKfo';

// ─── auth types ──────────────────────────────────────────────────────────────
type AuthMode = 'none' | 'signup' | 'signin';

// ─── sub-components ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

function Dots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 28 : 8,
            height: 8,
            borderRadius: 9999,
            backgroundColor: i === current ? '#3B82F6' : 'rgba(255,255,255,0.2)',
            boxShadow: i === current ? '0 0 8px rgba(59,130,246,0.6)' : 'none',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export function Onboarding() {
  const [slide, setSlide] = useState(0);
  const [authMode, setAuthMode] = useState<AuthMode>('none');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setError(null);
    setSuccessMsg(null);
  };

  const markOnboarded = () => localStorage.setItem('lexova_onboarded', '1');

  const handleGoogleOAuth = async () => {
    setOauthLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) { setError(error.message); setOauthLoading(false); }
    else markOnboarded();
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (authMode === 'signin') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      if (data.session?.access_token) {
        localStorage.setItem('lexova_jwt', data.session.access_token);
      }
      markOnboarded();
      navigate('/', { replace: true });
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) { setError(error.message); }
      else { setSuccessMsg('Check your email to confirm your account.'); markOnboarded(); }
      setLoading(false);
    }
  };

  const skip = useCallback(() => { setSlide(3); }, []);
  const next = useCallback(() => setSlide((s) => Math.min(s + 1, 3)), []);

  // shared skip button
  const SkipBtn = () => (
    <button
      onClick={skip}
      className="font-['Inter'] text-sm tracking-widest uppercase transition-colors"
      style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}
      onMouseEnter={(e) => (e.currentTarget.style.color = '#3B82F6')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
    >
      Skip
    </button>
  );

  // ── slide 0: Welcome ──────────────────────────────────────────────────────
  const Slide0 = () => (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      {/* bg */}
      <div className="absolute inset-0">
        <img src={IMG_VINYL} alt="" className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/60 to-transparent" />
      </div>
      {/* skip */}
      <div className="absolute top-8 right-8 z-20"><SkipBtn /></div>
      {/* content */}
      <div className="relative z-10 flex flex-col items-center text-center px-8 w-full max-w-lg">
        <h1
          className="font-['Noto_Serif'] uppercase tracking-widest mb-4"
          style={{ fontSize: 'clamp(3rem,9vw,5.5rem)', fontWeight: 700, color: '#fff', lineHeight: 1.05, letterSpacing: '0.08em' }}
        >
          Lexova
        </h1>
        <p className="font-['Inter'] font-light mb-16 max-w-xs" style={{ fontSize: '1.125rem', lineHeight: 1.6, color: 'rgba(229,226,227,0.7)' }}>
          The Discerning Curator
        </p>
        <button
          onClick={next}
          className="flex items-center gap-2 px-8 py-4 rounded-full font-['Inter'] font-semibold transition-all hover:brightness-110 hover:scale-105"
          style={{ backgroundColor: '#3B82F6', color: '#fff', fontSize: '0.875rem', letterSpacing: '0.05em', boxShadow: '0 0 40px 8px rgba(59,130,246,0.2)' }}
        >
          Start your journey
          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_forward</span>
        </button>
      </div>
      {/* now playing strip */}
      <div
        className="absolute bottom-0 w-full px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(20,20,20,0.5)', backdropFilter: 'blur(30px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            <img src={IMG_ALBUM_MINI} alt="Album art" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="font-['Inter'] text-xs font-medium" style={{ color: '#E8E0D4' }}>Midnight Sessions</span>
            <span className="font-['Inter'] text-xs" style={{ color: 'rgba(229,226,227,0.5)' }}>The Alchemist</span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <span className="material-symbols-outlined text-xl cursor-pointer" style={{ color: 'rgba(255,255,255,0.4)', fontVariationSettings: "'FILL' 0" }}>skip_previous</span>
          <div className="w-9 h-9 flex items-center justify-center rounded-full" style={{ backgroundColor: '#1c1b1c', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="material-symbols-outlined text-lg" style={{ color: '#3B82F6', fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
          </div>
          <span className="material-symbols-outlined text-xl cursor-pointer" style={{ color: 'rgba(255,255,255,0.4)', fontVariationSettings: "'FILL' 0" }}>skip_next</span>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-[2px]" style={{ backgroundColor: '#1a1a1a' }}>
          <div className="h-full w-1/3" style={{ backgroundColor: '#3B82F6' }} />
        </div>
      </div>
    </div>
  );

  // ── slide 1: The Wiki Side ────────────────────────────────────────────────
  const Slide1 = () => (
    <div className="relative w-full h-full flex overflow-hidden" style={{ backgroundColor: '#0A0A0B' }}>
      {/* skip */}
      <div className="absolute top-8 right-8 z-30"><SkipBtn /></div>
      {/* left editorial panel */}
      <div className="relative z-20 flex flex-col justify-center px-10 md:w-1/3 w-full h-full">
        <div
          className="absolute inset-0 md:hidden"
          style={{ background: 'rgba(10,10,11,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        />
        <div className="relative z-10 flex flex-col gap-6 max-w-sm">
          <div>
            <span
              className="font-['Inter'] text-xs uppercase tracking-widest px-3 py-1.5 rounded-full inline-block mb-5"
              style={{ color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)' }}
            >
              THE STORY
            </span>
            <h2 className="font-['Noto_Serif'] text-4xl font-semibold mb-3" style={{ color: '#e5e2e3', letterSpacing: '-0.01em' }}>
              Berlin, 1976
            </h2>
            <p className="font-['Inter'] text-base leading-relaxed" style={{ color: 'rgba(215,195,174,0.8)' }}>
              A period of intense creativity and personal reinvention. The cold war city offered a stark, isolated backdrop that birthed an entirely new sonic landscape.
            </p>
          </div>
          <button
            onClick={next}
            className="flex items-center gap-2 font-['Inter'] text-sm font-semibold w-fit transition-all group"
            style={{ color: '#3B82F6' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#93C5FD')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#3B82F6')}
          >
            Read more
            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_forward</span>
          </button>
        </div>
      </div>
      {/* right portrait */}
      <div className="absolute inset-0 md:relative md:w-2/3 md:h-full z-0 md:z-10 overflow-hidden">
        <img src={IMG_ARTIST} alt="" className="w-full h-full object-cover object-top opacity-50 md:opacity-100" style={{ mixBlendMode: 'luminosity' }} />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, #0A0A0B 0%, transparent 50%), linear-gradient(to right, #0A0A0B 0%, rgba(10,10,11,0.5) 30%, transparent 60%)' }}
        />
      </div>
      {/* dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
        <Dots current={1} total={4} />
      </div>
    </div>
  );

  // ── slide 2: The Hook ─────────────────────────────────────────────────────
  const Slide2 = () => (
    <div className="relative w-full h-full flex flex-col justify-end overflow-hidden" style={{ backgroundColor: '#0A0A0B' }}>
      {/* bg image */}
      <div className="absolute inset-0">
        <img src={IMG_HOOK} alt="" className="w-full h-full object-cover grayscale opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/80 to-[#0A0A0B]/40" />
      </div>
      {/* skip */}
      <div className="absolute top-8 right-8 z-20"><SkipBtn /></div>
      {/* content */}
      <div className="relative z-10 px-10 pb-32 flex flex-col gap-6">
        <Dots current={2} total={4} />
        <h1
          className="font-['Noto_Serif'] font-bold"
          style={{ fontSize: 'clamp(2.8rem,7vw,4.5rem)', lineHeight: 1.05, letterSpacing: '-0.02em', color: '#fff' }}
        >
          Every<br/>artist.<br/>Every<br/>story.<br/>Every<br/>song.
        </h1>
        <p className="font-['Inter'] text-lg max-w-xs" style={{ color: 'rgba(229,226,227,0.65)', lineHeight: 1.6 }}>
          A new way to listen — and to know.
        </p>
        <button
          onClick={next}
          className="flex items-center gap-2 px-6 py-3 rounded-full font-['Inter'] font-semibold w-fit transition-all hover:brightness-110"
          style={{ backgroundColor: '#3B82F6', color: '#fff', fontSize: '0.875rem', boxShadow: '0 0 24px rgba(59,130,246,0.25)' }}
        >
          Continue
          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_forward</span>
        </button>
      </div>
      {/* mini now-playing strip */}
      <div
        className="absolute bottom-0 left-0 w-full z-20 flex items-center justify-between px-6 h-14 border-t"
        style={{ background: 'rgba(10,10,11,0.6)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <div className="absolute top-0 left-0 w-2/5 h-[1.5px]" style={{ backgroundColor: '#3B82F6', boxShadow: '0 0 8px rgba(59,130,246,0.6)' }} />
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            <img src={IMG_ALBUM_MINI} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-['Inter'] text-xs font-medium" style={{ color: '#e5e2e3' }}>Lazarus</p>
            <p className="font-['Inter'] text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>David Bowie</p>
          </div>
        </div>
        <span className="material-symbols-outlined text-xl" style={{ color: '#3B82F6', fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
      </div>
    </div>
  );

  // ── slide 3: The Music Side + auth ────────────────────────────────────────
  const tracks = [
    { title: 'Prelude in C Minor', artist: 'The Night Quartet', dur: '2:45', img: IMG_THUMB_1, active: false },
    { title: 'Midnight Silhouette', artist: 'The Night Quartet', dur: '4:12', img: IMG_ALBUM, active: true },
    { title: 'Echoes of Analog', artist: 'The Night Quartet', dur: '3:50', img: IMG_THUMB_1, active: false },
    { title: 'Velvet Notes', artist: 'The Night Quartet', dur: '5:01', img: IMG_THUMB_1, active: false },
  ];

  const Slide3 = () => (
    <div
      className="relative w-full h-full flex flex-col justify-between overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #1a1025, #0A0A0B)' }}
    >
      {/* track list area */}
      <div className="flex-1 pt-16 px-6 relative z-10 overflow-hidden">
        {/* floating album art */}
        <div
          className="absolute -left-6 top-12 w-52 h-52 rounded-lg overflow-hidden shadow-2xl z-20"
          style={{ border: '1px solid rgba(255,255,255,0.1)', transform: 'rotate(2deg)', boxShadow: '0 0 40px rgba(59,130,246,0.12)' }}
        >
          <img src={IMG_ALBUM} alt="" className="w-full h-full object-cover" />
        </div>
        {/* track list */}
        <div className="pl-36 pt-4 space-y-3">
          {tracks.map((t) => (
            <div
              key={t.title}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5"
              style={{
                opacity: t.active ? 1 : 0.55,
                backgroundColor: t.active ? 'rgba(59,130,246,0.08)' : 'transparent',
                border: t.active ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent',
              }}
            >
              <div className="relative w-8 h-8 rounded-sm overflow-hidden flex-shrink-0">
                <img src={t.img} alt="" className="w-full h-full object-cover" />
                {t.active && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="flex gap-[2px] items-end h-3">
                      {[1, 0.66, 0.83].map((h, i) => (
                        <div key={i} className="w-[2px] animate-pulse" style={{ height: `${h * 12}px`, backgroundColor: '#3B82F6', animationDelay: `${i * 75}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-['Inter'] text-xs font-semibold truncate" style={{ color: t.active ? '#3B82F6' : '#e5e2e3' }}>{t.title}</p>
                <p className="font-['Inter'] text-[10px] truncate" style={{ color: t.active ? '#93C5FD' : 'rgba(215,195,174,0.7)' }}>{t.artist}</p>
              </div>
              <span className="font-['Inter'] text-[10px]" style={{ color: t.active ? '#3B82F6' : 'rgba(215,195,174,0.5)' }}>{t.dur}</span>
            </div>
          ))}
        </div>
      </div>

      {/* bottom copy + CTAs */}
      <div className="relative z-10 px-6 pb-8 flex flex-col gap-5">
        <div>
          <h2 className="font-['Noto_Serif'] text-2xl font-semibold mb-1" style={{ color: '#e5e2e3' }}>Built for listening.</h2>
          <p className="font-['Inter'] text-base" style={{ color: 'rgba(215,195,174,0.7)' }}>Discovery, depth, and a player that feels right.</p>
        </div>
        <Dots current={3} total={4} />
        <div className="flex flex-col gap-3">
          <button
            onClick={() => openAuth('signup')}
            className="w-full h-14 rounded-full font-['Inter'] font-semibold text-sm transition-all hover:brightness-110"
            style={{ backgroundColor: '#3B82F6', color: '#fff', boxShadow: '0 0 28px rgba(59,130,246,0.3)' }}
          >
            Get started
          </button>
          <button
            onClick={() => openAuth('signin')}
            className="w-full py-3 font-['Inter'] text-sm font-medium transition-colors"
            style={{ color: 'rgba(203,213,225,0.6)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#CBD5E1')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(203,213,225,0.6)')}
          >
            I already have an account
          </button>
        </div>
      </div>
    </div>
  );

  // ── auth bottom sheet ────────────────────────────────────────────────────
  const AuthSheet = () => (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) setAuthMode('none'); }}
    >
      <div
        className="rounded-t-3xl p-6 flex flex-col gap-5"
        style={{ backgroundColor: '#161b27', border: '1px solid #1e2535', borderBottom: 'none', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-1" style={{ backgroundColor: '#2a3347' }} />

        <h2 className="font-['Noto_Serif'] text-xl font-semibold text-center" style={{ color: '#F1F5F9' }}>
          {authMode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h2>

        {/* Google */}
        <button
          onClick={handleGoogleOAuth}
          disabled={oauthLoading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border font-['Inter'] text-sm font-medium transition-all hover:bg-white/5 disabled:opacity-60"
          style={{ borderColor: '#1e2535', color: '#CBD5E1' }}
        >
          {oauthLoading
            ? <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#3B82F6', borderTopColor: 'transparent' }} />
            : <GoogleIcon />}
          {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {/* divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ backgroundColor: '#1e2535' }} />
          <span className="font-['Inter'] text-xs" style={{ color: '#475569' }}>or use email</span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#1e2535' }} />
        </div>

        {/* form */}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full px-4 py-3 rounded-xl font-['Inter'] text-sm outline-none border transition-all"
            style={{ backgroundColor: '#0f1117', borderColor: '#1e2535', color: '#F1F5F9' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#3B82F6')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#1e2535')}
          />
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={authMode === 'signup' ? 'Password (min. 6 chars)' : 'Password'}
              required
              minLength={6}
              className="w-full px-4 pr-10 py-3 rounded-xl font-['Inter'] text-sm outline-none border transition-all"
              style={{ backgroundColor: '#0f1117', borderColor: '#1e2535', color: '#F1F5F9' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#3B82F6')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#1e2535')}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: '#475569' }}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} />
              <p className="font-['Inter'] text-xs" style={{ color: '#ef4444' }}>{error}</p>
            </div>
          )}
          {successMsg && (
            <div className="px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <p className="font-['Inter'] text-xs" style={{ color: '#22c55e' }}>{successMsg}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl font-['Inter'] text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60 mt-1"
            style={{ backgroundColor: '#3B82F6', color: '#fff', boxShadow: '0 0 20px rgba(59,130,246,0.25)' }}
          >
            {loading
              ? (authMode === 'signin' ? 'Signing in…' : 'Creating account…')
              : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* toggle */}
        <p className="text-center font-['Inter'] text-xs pb-2" style={{ color: '#475569' }}>
          {authMode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => openAuth(authMode === 'signin' ? 'signup' : 'signin')}
            style={{ color: '#3B82F6' }}
          >
            {authMode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );

  const slides = [<Slide0 />, <Slide1 />, <Slide2 />, <Slide3 />];

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: '#0A0A0B' }}>
      {/* slide container */}
      <div
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{ width: `${slides.length * 100}%`, transform: `translateX(-${(slide / slides.length) * 100}%)` }}
      >
        {slides.map((s, i) => (
          <div key={i} className="h-full" style={{ width: `${100 / slides.length}%`, flexShrink: 0 }}>
            {s}
          </div>
        ))}
      </div>

      {/* auth sheet overlay */}
      {authMode !== 'none' && <AuthSheet />}
    </div>
  );
}
