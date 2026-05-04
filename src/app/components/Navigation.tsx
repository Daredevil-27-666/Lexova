import { useState, useRef } from 'react';
import { Home, Compass, Library, Bell, Sparkles, User, Search as SearchIcon, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router';
import { useAuthState } from './hooks/useAuthState';
import { useNotificationCount } from './hooks/useYoutubeNotifications';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: Library, label: 'Library', path: '/library' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: Sparkles, label: 'Artists', path: '/artists', isSpecial: true },
];

function SearchBar() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') {
      setQuery('');
      inputRef.current?.blur();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 pb-3 pt-1">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all"
        style={{
          backgroundColor: '#111',
          borderColor: focused ? '#3B82F6' : '#1e1e1e',
          boxShadow: focused ? '0 0 0 2px rgba(59,130,246,0.2)' : 'none',
        }}
      >
        <SearchIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: focused ? '#3B82F6' : '#555' }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search music..."
          className="flex-1 bg-transparent outline-none font-['DM_Sans'] text-xs placeholder:opacity-40 min-w-0"
          style={{ color: '#E8E0D4' }}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="flex-shrink-0 rounded-full p-0.5 transition-colors hover:bg-white/10"
          >
            <X className="w-3 h-3" style={{ color: '#555' }} />
          </button>
        )}
      </div>
    </form>
  );
}

export function Navigation() {
  const { user, isLoggedIn } = useAuthState();
  const navigate = useNavigate();
  const notifCount = useNotificationCount();

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex flex-col w-60 border-r h-screen sticky top-0" style={{ 
        backgroundColor: 'var(--amazon-card)',
        borderColor: '#1a1a1a'
      }}>
        {/* Logo */}
        <div className="p-6 border-b" style={{ borderColor: '#1a1a1a' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--gold-accent)' }}>
              <span className="font-['Playfair_Display'] text-lg" style={{ color: '#fff' }}>L</span>
            </div>
            <span className="font-['Playfair_Display'] text-xl tracking-tight" style={{ color: 'var(--text-primary)' }}>Lexova</span>
          </div>
        </div>

        {/* Search Bar */}
        <SearchBar />

        {/* Nav Items */}
        <div className="flex-1 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 transition-all ${
                  isActive
                    ? 'bg-[var(--amazon-hover)]'
                    : 'hover:bg-[var(--amazon-hover)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <item.icon
                      className="w-5 h-5"
                      style={{ color: isActive ? (item.isSpecial ? 'var(--gold-accent)' : 'var(--amazon-white)') : 'var(--amazon-muted)' }}
                    />
                    {item.path === '/notifications' && notifCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-['DM_Sans'] text-[10px] font-bold" style={{ backgroundColor: '#3b82f6', color: '#fff' }}>
                        {notifCount > 99 ? '99+' : notifCount}
                      </span>
                    )}
                  </div>
                  <span
                    className="font-['DM_Sans'] font-medium"
                    style={{ color: isActive ? (item.isSpecial ? 'var(--gold-accent)' : 'var(--amazon-white)') : 'var(--amazon-muted)' }}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* User Section */}
        <div className="p-4 border-t" style={{ borderColor: '#1a1a1a' }}>
          {isLoggedIn && user ? (
            <NavLink to="/settings" className="flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all hover:bg-[var(--amazon-hover)]">
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <User className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </div>
              )}
              <div className="flex-1 text-left min-w-0">
                <div className="font-['DM_Sans'] text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {user.user_metadata?.full_name ?? user.email}
                </div>
                <div className="font-['DM_Sans'] text-xs" style={{ color: 'var(--text-secondary)' }}>View settings</div>
              </div>
            </NavLink>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all hover:bg-[var(--amazon-hover)]"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <User className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div className="flex-1 text-left">
                <div className="font-['DM_Sans'] text-sm" style={{ color: 'var(--text-primary)' }}>Sign In</div>
                <div className="font-['DM_Sans'] text-xs" style={{ color: 'var(--text-secondary)' }}>with Google</div>
              </div>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Bar */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 border-t z-30"
        style={{ 
          backgroundColor: 'var(--amazon-card)',
          borderColor: '#1a1a1a'
        }}
      >
        <div className="flex items-center justify-around py-2">
          {navItems.slice(0, 4).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className="flex flex-col items-center gap-1 px-4 py-2"
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <item.icon
                      className="w-6 h-6"
                      style={{ color: isActive ? (item.isSpecial ? 'var(--gold-accent)' : 'var(--amazon-white)') : 'var(--amazon-muted)' }}
                    />
                    {item.path === '/notifications' && notifCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-['DM_Sans'] text-[10px] font-bold" style={{ backgroundColor: '#3b82f6', color: '#fff' }}>
                        {notifCount > 99 ? '99+' : notifCount}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-xs font-['DM_Sans']"
                    style={{ color: isActive ? (item.isSpecial ? 'var(--gold-accent)' : 'var(--amazon-white)') : 'var(--amazon-muted)' }}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          {/* Mobile Search Icon */}
          <NavLink
            to="/search"
            className="flex flex-col items-center gap-1 px-4 py-2"
          >
            {({ isActive }) => (
              <>
                <SearchIcon className="w-6 h-6" style={{ color: isActive ? 'var(--amazon-white)' : 'var(--amazon-muted)' }} />
                <span className="text-xs font-['DM_Sans']" style={{ color: isActive ? 'var(--amazon-white)' : 'var(--amazon-muted)' }}>Search</span>
              </>
            )}
          </NavLink>
        </div>
      </nav>
    </>
  );
}
