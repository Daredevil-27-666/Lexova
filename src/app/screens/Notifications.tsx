import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { useNavigate } from 'react-router';
import { Sparkles, Play, Upload, X } from 'lucide-react';
import {
  useYoutubeNotifications,
  useDismissedNotifications,
  useDismissNotification,
  type Notification,
} from '../components/hooks/useYoutubeNotifications';

const ICON_MAP: Record<string, typeof Upload> = {
  'new-video': Upload,
  'collaboration': Upload,
  'timeline-update': Sparkles,
};

function formatRelativeTime(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(isoString).toLocaleDateString();
}

function handleNotificationClick(notification: Notification, navigate: ReturnType<typeof useNavigate>) {
  if (notification.type === 'new-video' || notification.type === 'collaboration') {
    navigate(`/watch/${notification.id}`);
  } else {
    navigate(`/artist/${notification.channel_id}`);
  }
}

function NotificationSkeleton() {
  return (
    <div className="flex gap-4 p-4 animate-pulse">
      <div className="w-14 h-14 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 rounded w-3/4" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        <div className="h-3 rounded w-1/4" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      </div>
    </div>
  );
}

export function Notifications() {
  const navigate = useNavigate();
  const { data: allNotifications = [], isLoading, isError } = useYoutubeNotifications();
  const { data: dismissed = [] } = useDismissedNotifications();
  const { mutate: dismiss } = useDismissNotification();

  const data = allNotifications.filter((n) => !dismissed.includes(n.id));

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b" style={{ borderColor: '#1a1a1a' }}>
        <h1 className="font-['Playfair_Display'] mb-2" style={{
          color: 'var(--text-primary)',
          fontSize: '2.5rem',
          fontWeight: '600'
        }}>
          Notifications
        </h1>
        <p className="font-['DM_Sans']" style={{
          color: 'var(--text-secondary)',
          fontSize: '1rem'
        }}>
          Stay updated with your favorite artists
        </p>
      </div>

      {/* Notifications List */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-1">
          {isLoading && Array.from({ length: 4 }).map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}

          {isError && (
            <p className="text-center py-16 font-['DM_Sans']" style={{ color: 'var(--text-secondary)' }}>
              Failed to load notifications
            </p>
          )}

          {!isLoading && !isError && data?.length === 0 && (
            <p className="text-center py-16 font-['DM_Sans']" style={{ color: 'var(--text-secondary)' }}>
              No notifications yet
            </p>
          )}

          {data?.map((notification) => {
            const Icon = ICON_MAP[notification.type] ?? Sparkles;
            const isSpecial = notification.is_special;

            return (
              <div
                key={notification.id}
                className="relative flex gap-4 p-4 rounded-lg transition-all hover:bg-[var(--amazon-hover)] group"
                style={{
                  backgroundColor: isSpecial ? 'rgba(201, 169, 110, 0.05)' : 'transparent'
                }}
              >
                {/* Dismiss button */}
                <button
                  onClick={(e) => { e.stopPropagation(); dismiss(notification.id); }}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                </button>

                {/* Clickable area */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNotificationClick(notification, navigate)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(notification, navigate)}
                  className="flex gap-4 flex-1 cursor-pointer min-w-0"
                >
                {/* Artist Avatar */}
                <div className="relative flex-shrink-0">
                  <img
                    src={notification.channel.thumbnail_url}
                    alt={notification.channel.title}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: isSpecial ? 'var(--gold-accent)' : 'var(--bg-elevated)',
                      border: '2px solid var(--bg-primary)'
                    }}
                  >
                    <Icon className="w-3 h-3" style={{ color: isSpecial ? 'var(--bg-primary)' : 'var(--text-secondary)' }} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="mb-1">
                    <span className="font-['DM_Sans']" style={{
                      color: 'var(--text-primary)',
                      fontWeight: '600'
                    }}>
                      {notification.channel.title}
                    </span>
                    <span className="font-['DM_Sans'] ml-1" style={{ color: 'var(--text-secondary)' }}>
                      {notification.message}
                    </span>
                  </div>
                  <h3 className="font-['DM_Sans'] mb-2" style={{
                    color: isSpecial ? 'var(--gold-accent)' : 'var(--text-primary)',
                    fontSize: '0.9375rem',
                    fontWeight: isSpecial ? '600' : '500'
                  }}>
                    {notification.title}
                  </h3>
                  <p className="font-['DM_Sans'] text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {formatRelativeTime(notification.published_at)}
                  </p>
                </div>

                {/* Thumbnail (if video) */}
                {notification.thumbnail_url && (
                  <div className="relative flex-shrink-0 rounded-lg overflow-hidden group" style={{ width: '160px', aspectRatio: '16/9' }}>
                    <ImageWithFallback
                      src={notification.thumbnail_url}
                      alt={notification.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--gold-accent)' }}>
                        <Play className="w-5 h-5 fill-current ml-0.5" style={{ color: 'var(--bg-primary)' }} />
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
