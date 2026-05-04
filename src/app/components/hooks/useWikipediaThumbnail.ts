import { useQuery } from '@tanstack/react-query';

async function fetchThumbnail(name: string): Promise<string | null> {
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
    { headers: { 'User-Agent': 'Discova-Prototype/1.0 (princeroy4102001@gmail.com)' } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return (data.thumbnail?.source as string) ?? null;
}

export function useWikipediaThumbnail(artistName: string) {
  return useQuery({
    queryKey: ['wikipedia-thumbnail', artistName.toLowerCase().trim()],
    queryFn: () => fetchThumbnail(artistName.trim()),
    enabled: !!artistName.trim(),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}
