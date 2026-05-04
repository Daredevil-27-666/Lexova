import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { useNavigate } from 'react-router';
import { Network } from 'lucide-react';

export function Artists() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b" style={{ borderColor: '#1a1a1a' }}>
        <div className="flex items-center gap-3 mb-4">
          <Network className="w-8 h-8" style={{ color: 'var(--gold-accent)' }} />
          <h1 className="font-['Playfair_Display']" style={{ 
            color: 'var(--text-primary)',
            fontSize: '2.5rem',
            fontWeight: '600'
          }}>
            Connections Map
          </h1>
        </div>
        <p className="font-['DM_Sans']" style={{ 
          color: 'var(--text-secondary)',
          fontSize: '1rem'
        }}>
          Explore the intricate web of musical relationships and influences
        </p>
      </div>

      {/* Interactive Map Preview */}
      <div className="px-6 py-12">
        <div 
          className="relative rounded-2xl overflow-hidden"
          style={{
            height: '600px',
            backgroundColor: 'var(--bg-elevated)',
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(201, 169, 110, 0.1) 0%, transparent 40%),
              radial-gradient(circle at 80% 70%, rgba(201, 169, 110, 0.08) 0%, transparent 40%),
              radial-gradient(circle at 50% 50%, rgba(201, 169, 110, 0.05) 0%, transparent 50%)
            `
          }}
        >
          {/* SVG Connection Lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
            <line x1="20%" y1="30%" x2="50%" y2="50%" stroke="var(--gold-accent)" strokeWidth="2" strokeDasharray="5,5" />
            <line x1="50%" y1="50%" x2="80%" y2="70%" stroke="var(--gold-accent)" strokeWidth="2" strokeDasharray="5,5" />
            <line x1="50%" y1="50%" x2="70%" y2="20%" stroke="var(--gold-accent)" strokeWidth="2" strokeDasharray="5,5" />
            <line x1="20%" y1="30%" x2="30%" y2="65%" stroke="var(--gold-accent)" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="80%" y1="70%" x2="70%" y2="20%" stroke="var(--gold-accent)" strokeWidth="1" strokeDasharray="3,3" />
          </svg>

          {/* Artist Nodes */}
          <div className="absolute" style={{ left: '20%', top: '30%', transform: 'translate(-50%, -50%)' }}>
            <div 
              onClick={() => navigate('/artist/UCBJtGODWGrM3fdQ0G5E9uAQ')}
              className="cursor-pointer group"
            >
              <div className="relative">
                <div 
                  className="w-24 h-24 rounded-full p-1 transition-all group-hover:scale-110"
                  style={{ backgroundColor: 'var(--gold-accent)' }}
                >
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1733916609663-391d7598eb7c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZW1hbGUlMjBqYXp6JTIwYXJ0aXN0JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzcyMDY2Mzc1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Elena Rivers"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="font-['DM_Sans'] text-sm px-3 py-1 rounded-full" style={{ 
                    backgroundColor: 'var(--bg-panel)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--gold-accent)'
                  }}>
                    Elena Rivers
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
            <div 
              onClick={() => navigate('/artist/UCZGBua-dvwfSdcF9AskDIgw')}
              className="cursor-pointer group"
            >
              <div className="relative">
                <div 
                  className="w-32 h-32 rounded-full p-1 transition-all group-hover:scale-110"
                  style={{ backgroundColor: 'var(--gold-accent)' }}
                >
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1762160767032-9a639bc9f89e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpY2lhbiUyMGFydGlzdCUyMHBvcnRyYWl0JTIwc3R1ZGlvfGVufDF8fHx8MTc3MTk4ODAzMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Marcus Webb"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="font-['DM_Sans'] text-sm px-3 py-1 rounded-full" style={{ 
                    backgroundColor: 'var(--bg-panel)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--gold-accent)'
                  }}>
                    Marcus Webb
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute" style={{ left: '80%', top: '70%', transform: 'translate(-50%, -50%)' }}>
            <div 
              onClick={() => navigate('/artist/UC3-Y8IfhCgjIUNwDySbhQiA')}
              className="cursor-pointer group"
            >
              <div className="relative">
                <div 
                  className="w-24 h-24 rounded-full p-1 transition-all group-hover:scale-110"
                  style={{ backgroundColor: 'var(--gold-accent)' }}
                >
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1765452041692-2ded8e24be06?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaW5nZXIlMjBzb3VsJTIwYXJ0aXN0JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzcyMDY3NDExfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Arooj Aftab"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="font-['DM_Sans'] text-sm px-3 py-1 rounded-full" style={{ 
                    backgroundColor: 'var(--bg-panel)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--gold-accent)'
                  }}>
                    Arooj Aftab
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute" style={{ left: '70%', top: '20%', transform: 'translate(-50%, -50%)' }}>
            <div 
              onClick={() => navigate('/artist/UCmD8TDgJxofPfxA8GTpaCCQ')}
              className="cursor-pointer group"
            >
              <div className="relative">
                <div 
                  className="w-20 h-20 rounded-full p-1 transition-all group-hover:scale-110"
                  style={{ backgroundColor: 'var(--gold-accent)' }}
                >
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1692552951556-dd9072f30c14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGFzc2ljYWwlMjBwaWFuaXN0JTIwcGVyZm9ybWFuY2V8ZW58MXx8fHwxNzcyMDY3NDEyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Yuki Tanaka"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="font-['DM_Sans'] text-sm px-3 py-1 rounded-full" style={{ 
                    backgroundColor: 'var(--bg-panel)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--gold-accent)'
                  }}>
                    Yuki Tanaka
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute" style={{ left: '30%', top: '65%', transform: 'translate(-50%, -50%)' }}>
            <div 
              onClick={() => navigate('/artist/UC5NbPNPbdLwAPPwWTJw0EbQ')}
              className="cursor-pointer group"
            >
              <div className="relative">
                <div 
                  className="w-20 h-20 rounded-full p-1 transition-all group-hover:scale-110"
                  style={{ backgroundColor: 'var(--gold-accent)' }}
                >
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1760160741849-0809daa8e4c8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpZSUyMGZvbGslMjBtdXNpY2lhbnxlbnwxfHx8fDE3NzIwNjc0MTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="The Nomads"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="font-['DM_Sans'] text-sm px-3 py-1 rounded-full" style={{ 
                    backgroundColor: 'var(--bg-panel)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--gold-accent)'
                  }}>
                    The Nomads
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center Info */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Network className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--gold-accent)', opacity: 0.2 }} />
              <p className="font-['DM_Sans'] text-sm" style={{ color: 'var(--text-secondary)' }}>
                Interactive map (coming soon)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6">
        <div 
          className="rounded-xl p-8"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <h2 className="font-['Playfair_Display'] mb-6" style={{ 
            color: 'var(--text-primary)',
            fontSize: '1.5rem',
            fontWeight: '600'
          }}>
            How It Works
          </h2>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 169, 110, 0.2)' }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--gold-accent)' }} />
              </div>
              <h3 className="font-['DM_Sans'] mb-2" style={{ 
                color: 'var(--text-primary)',
                fontWeight: '600'
              }}>
                Influence
              </h3>
              <p className="font-['DM_Sans'] text-sm" style={{ 
                color: 'var(--text-secondary)',
                lineHeight: '1.6'
              }}>
                Discover which artists inspired and shaped the musical direction of your favorites
              </p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 169, 110, 0.2)' }}>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--gold-accent)' }} />
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--gold-accent)' }} />
                </div>
              </div>
              <h3 className="font-['DM_Sans'] mb-2" style={{ 
                color: 'var(--text-primary)',
                fontWeight: '600'
              }}>
                Collaboration
              </h3>
              <p className="font-['DM_Sans'] text-sm" style={{ 
                color: 'var(--text-secondary)',
                lineHeight: '1.6'
              }}>
                Explore the creative partnerships and studio sessions that produced iconic music
              </p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 169, 110, 0.2)' }}>
                <Network className="w-6 h-6" style={{ color: 'var(--gold-accent)' }} />
              </div>
              <h3 className="font-['DM_Sans'] mb-2" style={{ 
                color: 'var(--text-primary)',
                fontWeight: '600'
              }}>
                Musical Networks
              </h3>
              <p className="font-['DM_Sans'] text-sm" style={{ 
                color: 'var(--text-secondary)',
                lineHeight: '1.6'
              }}>
                See how artists connect through scenes, movements, and shared musical philosophies
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
