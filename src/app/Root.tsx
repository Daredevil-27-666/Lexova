import { Outlet } from 'react-router';
import { Toaster } from 'sonner';
import { Navigation } from './components/Navigation';

export function Root() {
  return (
    <div className="min-h-screen font-['DM_Sans'] flex flex-col" style={{ backgroundColor: 'var(--amazon-bg)' }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <div className="hidden lg:block">
          <Navigation />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      <Toaster position="bottom-right" theme="dark" />

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden">
        <Navigation />
      </div>
    </div>
  );
}