import * as Tabs from '@radix-ui/react-tabs';
import { useState } from 'react';
import { useParams } from 'react-router';
import { toast } from 'sonner';
import { VideoPlayer } from '../components/VideoPlayer';
import { VideoDetails } from '../components/VideoDetails';
import { RecommendationsSidebar } from '../components/RecommendationsSidebar';
import { ArtistPanel } from '../components/ArtistPanel';
import { useVideoDetails } from '../components/hooks/useVideoDetails';
import { useArtist } from '../components/hooks/useArtist';
import { useFollowing, useFollowArtist, useUnfollowArtist } from '../components/hooks/useLibraryData';
import { Sparkles, UserPlus, UserCheck } from 'lucide-react';

export function Watch() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: videoData } = useVideoDetails(id);
  const artistId = videoData?.channelId ?? '';

  const { data: following = [] } = useFollowing();
  const { data: artistData } = useArtist(artistId);
  const { mutate: followArtist } = useFollowArtist();
  const { mutate: unfollowArtist } = useUnfollowArtist();

  // Optimistic state: null means "use server state", true/false overrides immediately
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const serverFollowing = following.some((a) => a.id === artistId);
  const isFollowing = optimistic !== null ? optimistic : serverFollowing;

  const handleFollowToggle = () => {
    if (!artistId) {
      toast.error('Artist info not loaded yet — try again in a moment');
      return;
    }
    const artistName = videoData?.channelName ?? artistData?.name ?? 'Artist';
    if (isFollowing) {
      setOptimistic(false);
      unfollowArtist(artistId, {
        onSuccess: () => { setOptimistic(null); toast.success(`Unfollowed ${artistName}`); },
        onError: () => { setOptimistic(null); toast.error('Could not unfollow — please try again'); },
      });
    } else {
      setOptimistic(true);
      followArtist(
        {
          id: artistId,
          name: artistName,
          avatar: artistData?.avatarUrl ?? `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
          genre: artistData?.genres?.[0] ?? 'Music',
        },
        {
          onSuccess: () => { setOptimistic(null); toast.success(`Following ${artistName}`); },
          onError: (err) => { setOptimistic(null); toast.error(`Follow failed: ${err instanceof Error ? err.message : JSON.stringify(err)}`); },
        },
      );
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-[1440px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Main Content Column (68%) */}
          <div className="flex-1" style={{ width: '68%' }}>
            <VideoPlayer
              videoId={id}
              posterImage={`https://img.youtube.com/vi/${id}/maxresdefault.jpg`}
            />

            <VideoDetails />

            <Tabs.Root defaultValue="artist" className="w-full">
              <div className="flex items-center border-b mb-1" style={{ borderColor: '#1a1a1a' }}>
                <Tabs.List className="flex items-center gap-1">
                  <Tabs.Trigger
                    value="description"
                    className="group px-4 py-3 font-['DM_Sans'] text-sm transition-all relative data-[state=active]:font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Description
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-data-[state=active]:opacity-100 transition-opacity"
                      style={{ backgroundColor: 'var(--text-primary)' }}
                    />
                  </Tabs.Trigger>

                  <Tabs.Trigger
                    value="artist"
                    className="group px-4 py-3 font-['DM_Sans'] text-sm transition-all relative flex items-center gap-2 data-[state=active]:font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--gold-accent)' }} />
                    Artist
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-data-[state=active]:opacity-100 transition-opacity"
                      style={{ backgroundColor: 'var(--gold-accent)' }}
                    />
                  </Tabs.Trigger>
                </Tabs.List>

                <button
                  onClick={handleFollowToggle}
                  className="ml-auto mb-1 flex items-center gap-2 px-4 py-2 rounded-full font-['DM_Sans'] text-sm font-medium transition-all hover:opacity-90"
                  style={{
                    backgroundColor: isFollowing ? 'rgba(59,130,246,0.15)' : '#3b82f6',
                    color: isFollowing ? '#3b82f6' : '#fff',
                    border: isFollowing ? '1px solid #3b82f6' : '1px solid transparent',
                  }}
                >
                  {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>

              {/* Description Tab */}
              <Tabs.Content value="description" className="mt-6">
                <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-panel)' }}>
                  {videoData?.description ? (
                    videoData.description.split('\n').filter(p => p.trim()).map((para, i) => (
                      <p
                        key={i}
                        className="font-['DM_Sans'] mb-3 last:mb-0"
                        style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: '1.7' }}
                      >
                        {para}
                      </p>
                    ))
                  ) : (
                    <p className="font-['DM_Sans']" style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                      No description available.
                    </p>
                  )}
                </div>
              </Tabs.Content>

              {/* Artist Tab */}
              <Tabs.Content value="artist" className="mt-6">
                <ArtistPanel artistId={videoData?.channelId} />
              </Tabs.Content>
            </Tabs.Root>
          </div>

          {/* Recommendations Sidebar (32%) */}
          <div className="flex-shrink-0" style={{ width: '32%' }}>
            <RecommendationsSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
 