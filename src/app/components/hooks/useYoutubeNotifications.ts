import { supabase } from '../../../lib/supabase';
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const DISMISSED_KEY = 'notifications:dismissed:v1';
const EDGE_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;
const authHeaders = { Authorization: `Bearer ${publicAnonKey}` };

async function kvGet<T>(key: string): Promise<T | null> {
  const res = await fetch(`${EDGE_BASE}/kv/${encodeURIComponent(key)}`, { headers: authHeaders });
  if (!res.ok) return null;
  const json = await res.json();
  return (json.value as T) ?? null;
}

async function kvSet<T>(key: string, value: T): Promise<void> {
  const res = await fetch(`${EDGE_BASE}/kv/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`kvSet ${res.status}`);
}

export interface NotificationChannel {
  id: string;
  title: string;        // your DB column is "title", not "name"
  thumbnail_url: string;
}

export interface Notification {
  id: string;             // YouTube video ID (the PK in your schema)
  type: string;           // 'new-video' | 'timeline-update'
  title: string;
  message: string;
  thumbnail_url: string | null;
  is_special: boolean;
  published_at: string;
  channel_id: string;
  channel: NotificationChannel;
}

// Singleton realtime channel — Supabase reuses channels by name, so calling
// .on() on an already-subscribed channel throws. One channel shared across all
// hook instances, ref-counted so it's cleaned up when no one is using it.
let _realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let _subscriberCount = 0;

function mountRealtimeChannel(qc: ReturnType<typeof useQueryClient>) {
  if (_subscriberCount === 0) {
    _realtimeChannel = supabase
      .channel('notifications-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => qc.invalidateQueries({ queryKey: ['notifications'] }),
      )
      .subscribe();
  }
  _subscriberCount++;
  return () => {
    _subscriberCount--;
    if (_subscriberCount === 0 && _realtimeChannel) {
      supabase.removeChannel(_realtimeChannel);
      _realtimeChannel = null;
    }
  };
}

export function useYoutubeNotifications() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, message, thumbnail_url, is_special, published_at, channel_id, channel:channels(id, title, thumbnail_url)')
        .order('published_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as unknown as Notification[];
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => mountRealtimeChannel(qc), [qc]);

  return query;
}

export function useDismissedNotifications() {
  return useQuery({
    queryKey: ['notifications', 'dismissed'],
    queryFn: async (): Promise<string[]> => {
      const data = await kvGet<string[]>(DISMISSED_KEY);
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useDismissNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const current = await kvGet<string[]>(DISMISSED_KEY) ?? [];
      const next = [...new Set([...current, notificationId])];
      await kvSet(DISMISSED_KEY, next);
      return next;
    },
    onSuccess: (next) => {
      qc.setQueryData(['notifications', 'dismissed'], next);
    },
  });
}

export function useNotificationCount() {
  const { data: notifications = [] } = useYoutubeNotifications();
  const { data: dismissed = [] } = useDismissedNotifications();
  return notifications.filter((n) => !dismissed.includes(n.id)).length;
}
