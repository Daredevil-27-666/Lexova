import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';

export interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
}

export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // getSession() awaits Supabase's full initialization, including the OAuth
    // PKCE code exchange from the URL. It must be the sole place that clears
    // loading — onAuthStateChange can fire INITIAL_SESSION with a null session
    // before the exchange finishes, which would incorrectly flip loading=false
    // and cause RequireAuth to redirect to /onboarding before auth is settled.
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      // deliberately NOT calling setLoading(false) here — see note above
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, isLoggedIn: !!user, loading };
}
