import { useQuery } from '@tanstack/react-query';
import { genai, GEMINI_MODEL } from '../../../lib/gemini';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-cc7585ff`;

export interface TimelineEntry {
  year: number;
  month: string | null;
  day: number | null;
  title: string;
  type: string;
  highlight: boolean;
}

function sortEntries(entries: TimelineEntry[]): TimelineEntry[] {
  return entries.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return a.title.localeCompare(b.title);
  });
}

// ─── Edge function sources ────────────────────────────────────────────────────

async function fetchFromMusicBrainz(artistName: string, signal?: AbortSignal): Promise<TimelineEntry[]> {
  const url = `${BASE_URL}/musicbrainz/timeline?name=${encodeURIComponent(artistName)}`;
  const res = await fetch(url, {
    signal,
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
  if (!res.ok) throw new Error(`MusicBrainz proxy error: ${res.status}`);
  const data = await res.json();
  return data.entries ?? [];
}

async function fetchFromAudioDb(artistName: string, signal?: AbortSignal): Promise<TimelineEntry[]> {
  const url = `${BASE_URL}/audiodb/discography?name=${encodeURIComponent(artistName)}`;
  const res = await fetch(url, {
    signal,
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
  if (!res.ok) throw new Error(`AudioDB proxy error: ${res.status}`);
  const data = await res.json();
  return data.entries ?? [];
}

// ─── Gemini fallback ──────────────────────────────────────────────────────────

async function fetchFromGemini(artistName: string): Promise<TimelineEntry[]> {
  const response = await genai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `List the discography of music artist "${artistName}" as a JSON array. Each object must have: year (number), title (string), type ("Album"|"EP"|"Single"|"Compilation"|"Live"). Sort newest first. Return ONLY the raw JSON array with no markdown or explanation.`,
  });
  const raw = (response.text ?? '').trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  const parsed: Array<{ year: number; title: string; type?: string }> = JSON.parse(raw);
  return parsed.map((item) => ({
    year: item.year,
    month: null,
    day: null,
    title: item.title,
    type: item.type ?? 'Album',
    highlight: item.type === 'Album',
  }));
}

// ─── Combined fetch with fallback chain ───────────────────────────────────────

async function fetchTimeline(artistName: string, signal?: AbortSignal): Promise<TimelineEntry[]> {
  try {
    const entries = await fetchFromMusicBrainz(artistName, signal);
    if (entries.length > 0) return sortEntries(entries);
  } catch { /* fall through */ }

  try {
    const entries = await fetchFromAudioDb(artistName, signal);
    if (entries.length > 0) return sortEntries(entries);
  } catch { /* fall through */ }

  const entries = await fetchFromGemini(artistName);
  return sortEntries(entries);
}

export function useTimeline(artistName: string) {
  return useQuery({
    queryKey: ['timeline', artistName.toLowerCase().trim()],
    queryFn: ({ signal }) => fetchTimeline(artistName.trim(), signal),
    enabled: !!artistName.trim(),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
