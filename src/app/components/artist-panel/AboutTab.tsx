import { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { useArtist } from '../hooks/useArtist';

interface AboutTabProps {
  artistId: string;
}

const AboutTab = memo(function AboutTab({ artistId }: AboutTabProps) {
  const { data: artist, isLoading } = useArtist(artistId);

  const bioText = artist?.bio ?? '';
  const paragraphs = bioText.split('\n').filter(p => p.trim().length > 0);

  return (
    <div className="flex flex-col gap-8">

      {/* ── Biography ─────────────────────────────────────────────────────── */}
      <div>
        <h3
          className="font-['Playfair_Display'] text-xl font-semibold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          Biography
        </h3>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading biography…
          </div>
        ) : !bioText ? (
          <p className="font-['DM_Sans'] text-sm" style={{ color: 'var(--text-secondary)' }}>
            No biography found for this artist.
          </p>
        ) : (
          <div className="space-y-3">
            {paragraphs.map((para, i) => (
              <p
                key={i}
                className="font-['DM_Sans'] text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {para}
              </p>
            ))}
          </div>
        )}
      </div>

    </div>
  );
});

export { AboutTab };
