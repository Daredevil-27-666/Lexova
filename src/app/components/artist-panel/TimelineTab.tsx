import { useTimeline, type TimelineEntry } from '../hooks/useTimeline';

interface TimelineTabProps {
  artistName: string;
}

const TYPE_COLORS: Record<string, string> = {
  'Album':       '#3B82F6',
  'EP':          '#8B5CF6',
  'Single':      '#10B981',
  'Live':        '#F59E0B',
  'Compilation': '#EC4899',
  'Broadcast':   '#F97316',
  'Unknown':     '#555',
};

function colorFor(type: string): string {
  return TYPE_COLORS[type] ?? TYPE_COLORS['Unknown'];
}

export function TimelineTab({ artistName }: TimelineTabProps) {
  const { data: entries, isLoading, isError, error } = useTimeline(artistName);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64" style={{ color: 'var(--text-secondary)' }}>
        Loading timeline…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 rounded-lg text-red-400" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        {error instanceof Error ? error.message : 'Failed to load timeline.'}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center p-8" style={{ color: 'var(--text-secondary)' }}>
        No timeline data found for this artist.
      </div>
    );
  }

  const byYear = entries.reduce<Record<number, TimelineEntry[]>>((acc, entry) => {
    if (!acc[entry.year]) acc[entry.year] = [];
    acc[entry.year].push(entry);
    return acc;
  }, {});

  const sortedYears = Object.keys(byYear).map(Number).sort((a, b) => b - a);

  return (
    <div>
      <h3
        className="font-['Playfair_Display'] mb-6"
        style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 600 }}
      >
        Career Timeline
      </h3>

      <div className="relative">
        {/* Vertical spine */}
        <div className="absolute left-[7px] top-2 bottom-0 w-px" style={{ backgroundColor: '#222' }} />

        <div className="flex flex-col gap-8">
          {sortedYears.map((year) => (
            <div key={year} className="relative pl-10">
              {/* Year dot */}
              <div
                className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full border-2"
                style={{ backgroundColor: '#0D0D0D', borderColor: '#3B82F6' }}
              />

              <div
                className="font-['Playfair_Display'] text-base font-semibold mb-3"
                style={{ color: 'var(--text-primary)' }}
              >
                {year}
              </div>

              <div className="flex flex-col gap-3">
                {byYear[year].map((entry, idx) => {
                  const color = colorFor(entry.type);
                  return (
                    <div
                      key={`${year}-${idx}`}
                      className="flex items-start gap-3 p-3 rounded-xl"
                      style={{
                        backgroundColor: entry.highlight
                          ? 'rgba(59,130,246,0.06)'
                          : 'var(--bg-elevated)',
                        border: entry.highlight
                          ? '1px solid rgba(59,130,246,0.18)'
                          : '1px solid transparent',
                      }}
                    >
                      <span
                        className="flex-shrink-0 font-['DM_Sans'] text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5"
                        style={{ backgroundColor: color + '22', color }}
                      >
                        {entry.type}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div
                          className="font-['DM_Sans'] font-semibold text-sm leading-snug"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {entry.title}
                        </div>
                        {(entry.month || entry.day) && (
                          <div
                            className="font-['DM_Sans'] text-xs mt-0.5"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {[entry.month, entry.day].filter(Boolean).join(' ')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
