import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthState } from './hooks/useAuthState';

export function RequireAuth() {
  const { isLoggedIn, loading } = useAuthState();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f1117' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#3B82F6', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!isLoggedIn) {
    const dest = localStorage.getItem('lexova_onboarded') ? '/login' : '/onboarding';
    return <Navigate to={dest} state={{ from: location }} replace />;
  }

  return <Outlet />;
}
