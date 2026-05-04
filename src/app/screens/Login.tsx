import { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';

export function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div
        className="w-full max-w-md px-8 py-12 rounded-2xl"
        style={{ backgroundColor: 'var(--amazon-card)', border: '1px solid #1a1a1a' }}
      >
        <div className="text-center mb-10">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--gold-accent)' }}
          >
            <span className="font-['Playfair_Display'] text-2xl" style={{ color: '#fff' }}>L</span>
          </div>
          <h1 className="font-['Playfair_Display'] text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>
            Welcome to Lexova
          </h1>
          <p className="font-['DM_Sans'] text-sm" style={{ color: 'var(--text-secondary)' }}>
            Sign in to get personalised recommendations and more.
          </p>
        </div>

        {error && (
          <div
            className="mb-6 px-4 py-3 rounded-lg text-sm font-['DM_Sans']"
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
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-full font-['DM_Sans'] font-semibold transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{ backgroundColor: '#fff', color: '#1a1a1a' }}
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        <button
          onClick={() => navigate(-1)}
          className="w-full mt-4 py-3 font-['DM_Sans'] text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-secondary)' }}
        >
          Back
        </button>
      </div>
    </div>
  );
}
