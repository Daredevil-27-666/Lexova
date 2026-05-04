import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Tab = 'signin' | 'signup';

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

export function Login() {
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const handleGoogleOAuth = async () => {
    setOauthLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${from}` },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (tab === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        navigate(from, { replace: true });
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}${from}` },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccessMsg('Check your email to confirm your account.');
      }
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#0f1117' }}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ backgroundColor: '#3B82F6', boxShadow: '0 0 32px rgba(59,130,246,0.4)' }}
          >
            <span className="font-['Playfair_Display'] text-2xl font-bold text-white">L</span>
          </div>
          <h1 className="font-['Playfair_Display'] text-2xl font-bold" style={{ color: '#F1F5F9' }}>
            Lexova
          </h1>
          <p className="font-['DM_Sans'] text-sm mt-1" style={{ color: '#64748B' }}>
            The Discerning Curator
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 border"
          style={{ backgroundColor: '#161b27', borderColor: '#1e2535' }}
        >
          {/* Tabs */}
          <div
            className="flex rounded-xl p-1 mb-6"
            style={{ backgroundColor: '#0f1117' }}
          >
            {(['signin', 'signup'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setSuccessMsg(null); }}
                className="flex-1 py-2 rounded-lg font-['DM_Sans'] text-sm font-medium transition-all"
                style={{
                  backgroundColor: tab === t ? '#3B82F6' : 'transparent',
                  color: tab === t ? '#fff' : '#64748B',
                  boxShadow: tab === t ? '0 0 12px rgba(59,130,246,0.3)' : 'none',
                }}
              >
                {t === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleOAuth}
            disabled={oauthLoading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border font-['DM_Sans'] text-sm font-medium transition-all hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed mb-5"
            style={{ borderColor: '#1e2535', color: '#CBD5E1' }}
          >
            {oauthLoading ? (
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#3B82F6', borderTopColor: 'transparent' }} />
            ) : (
              <GoogleIcon />
            )}
            {oauthLoading ? 'Redirecting…' : `Continue with Google`}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ backgroundColor: '#1e2535' }} />
            <span className="font-['DM_Sans'] text-xs" style={{ color: '#475569' }}>or continue with email</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#1e2535' }} />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block font-['DM_Sans'] text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#475569' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl font-['DM_Sans'] text-sm outline-none border transition-all"
                  style={{
                    backgroundColor: '#0f1117',
                    borderColor: '#1e2535',
                    color: '#F1F5F9',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#3B82F6')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#1e2535')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block font-['DM_Sans'] text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#475569' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === 'signup' ? 'Min. 6 characters' : '••••••••'}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-10 py-3 rounded-xl font-['DM_Sans'] text-sm outline-none border transition-all"
                  style={{
                    backgroundColor: '#0f1117',
                    borderColor: '#1e2535',
                    color: '#F1F5F9',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#3B82F6')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#1e2535')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#475569' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#94A3B8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error / Success */}
            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} />
                <p className="font-['DM_Sans'] text-xs" style={{ color: '#ef4444' }}>{error}</p>
              </div>
            )}
            {successMsg && (
              <div className="px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <p className="font-['DM_Sans'] text-xs" style={{ color: '#22c55e' }}>{successMsg}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-['DM_Sans'] text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              style={{
                backgroundColor: '#3B82F6',
                color: '#fff',
                boxShadow: '0 0 20px rgba(59,130,246,0.25)',
              }}
            >
              {loading
                ? (tab === 'signin' ? 'Signing in…' : 'Creating account…')
                : (tab === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>

        <p className="text-center font-['DM_Sans'] text-xs mt-5" style={{ color: '#334155' }}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
