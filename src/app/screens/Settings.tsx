import { User, Bell, Lock, CreditCard, SlidersHorizontal, Globe, HelpCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { useAuthState } from '../components/hooks/useAuthState';

const settingsSections = [
  {
    title: 'Account',
    items: [
      { icon: User, label: 'Profile Settings', description: 'Update your personal information' },
      { icon: Lock, label: 'Privacy & Security', description: 'Manage your account security' },
      { icon: CreditCard, label: 'Subscription', description: 'Manage your premium subscription' },
    ]
  },
  {
    title: 'Preferences',
    items: [
      { icon: Bell, label: 'Notifications', description: 'Configure notification preferences' },
      { icon: SlidersHorizontal, label: 'Equaliser', description: 'Adjust audio settings and sound quality' },
      { icon: Globe, label: 'Language & Region', description: 'Change language and location settings' },
    ]
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, label: 'Help Center', description: 'Get help and support' },
    ]
  }
];

export function Settings() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuthState();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-['Playfair_Display'] text-4xl mb-2" style={{ color: 'var(--text-primary)' }}>
            Settings
          </h1>
          {isLoggedIn && user ? (
            <div className="flex items-center gap-3 mt-3">
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <User className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </div>
              )}
              <p className="font-['DM_Sans'] text-sm" style={{ color: 'var(--text-secondary)' }}>
                Signed in as <span style={{ color: 'var(--text-primary)' }}>{user.user_metadata?.full_name ?? user.email}</span>
              </p>
            </div>
          ) : (
            <p className="font-['DM_Sans'] text-lg" style={{ color: 'var(--text-secondary)' }}>
              Manage your account and preferences
            </p>
          )}
        </div>

        {/* Settings Sections */}
        <div className="space-y-8">
          {settingsSections.map((section) => (
            <div key={section.title}>
              <h2 className="font-['DM_Sans'] font-semibold text-sm uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
                {section.title}
              </h2>
              <div className="rounded-lg overflow-hidden border" style={{
                backgroundColor: 'var(--amazon-card)',
                borderColor: '#1a1a1a'
              }}>
                {section.items.map((item, index) => (
                  <button
                    key={item.label}
                    className={`w-full flex items-center gap-4 px-6 py-4 transition-all hover:bg-[var(--amazon-hover)] ${
                      index !== section.items.length - 1 ? 'border-b' : ''
                    }`}
                    style={{ borderColor: '#1a1a1a' }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                      <item.icon className="w-5 h-5" style={{ color: 'var(--gold-accent)' }} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-['DM_Sans'] font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
                        {item.label}
                      </div>
                      <div className="font-['DM_Sans'] text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {item.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Sign in / Log out */}
          <div className="pt-4">
            {isLoggedIn ? (
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg transition-all border"
                style={{ backgroundColor: 'transparent', borderColor: '#1a1a1a', color: '#ef4444' }}
              >
                <LogOut className="w-5 h-5" />
                <span className="font-['DM_Sans'] font-medium">Log Out</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg transition-all border"
                style={{ backgroundColor: 'transparent', borderColor: 'rgba(201,169,110,0.3)', color: 'var(--gold-accent)' }}
              >
                <span className="font-['DM_Sans'] font-medium">Sign In with Google</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
