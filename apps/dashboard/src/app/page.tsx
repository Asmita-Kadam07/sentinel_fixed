'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Service, Incident, SystemHealth } from '@sentinel/shared';
import { ServiceCard } from '@/components/ServiceCard';
import { IncidentTable } from '@/components/IncidentTable';
import { HealthMetrics } from '@/components/HealthMetrics';
import { IncidentTimeline } from '@/components/IncidentTimeline';
import { AgentStatus } from '@/components/AgentStatus';
import { PostmortemPanel } from '@/components/PostmortemPanel';

const POLL_INTERVAL = 5000;

export default function DashboardPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [svcRes, incRes, healthRes] = await Promise.all([
        fetch('/api/services'),
        fetch('/api/incidents'),
        fetch('/api/health'),
      ]);
      if (!svcRes.ok || !incRes.ok || !healthRes.ok) throw new Error('API error');
      const [svcData, incData, healthData] = await Promise.all([
        svcRes.json() as Promise<{ services: Service[] }>,
        incRes.json() as Promise<{ incidents: Incident[] }>,
        healthRes.json() as Promise<SystemHealth>,
      ]);
      setServices(svcData.services);
      setIncidents(incData.incidents);
      setHealth(healthData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => void fetchData(), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const activeIncidents = incidents.filter((i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS');
  const resolvedIncidents = incidents.filter((i) => i.status === 'RESOLVED');

  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 768px) {
          .two-col { grid-template-columns: 1fr !important; }
          .header-subtitle { display: none !important; }
          .main-pad { padding: 1rem !important; }
        }
        @media (max-width: 480px) {
          .header-inner { padding: 0 1rem !important; }
          .header-title { font-size: 13px !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(13,17,23,0.9)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100,
        padding: '0',
      }}>
        <div className="header-inner" style={{
          maxWidth: '1400px', margin: '0 auto',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', height: '52px',
          padding: '0 2rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '26px', height: '26px', background: 'var(--accent-cyan)',
              borderRadius: '6px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '13px', fontWeight: 700,
              color: 'var(--bg-base)', fontFamily: 'var(--font-mono)', flexShrink: 0,
            }}>S</div>
            <span className="header-title" style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '15px',
              letterSpacing: '-0.02em', color: 'var(--text-primary)',
            }}>PROJECT SENTINEL</span>
            <span className="header-subtitle" style={{
              fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
              paddingLeft: '8px', borderLeft: '1px solid var(--border-subtle)',
            }}>AUTONOMOUS RESOLUTION ENGINE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {lastUpdated && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: error ? 'var(--accent-red)' : 'var(--accent-green)',
              animation: 'blink 2s infinite',
            }} />
          </div>
        </div>
      </header>

      <main className="main-pad" style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 2rem' }}>
        {loading ? <LoadingState /> : error ? <ErrorState error={error} /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

            {health && <HealthMetrics health={health} />}

            <section>
              <SectionHeader label="SERVICE STATUS" count={services.length} />
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                gap: '0.875rem', marginTop: '0.875rem',
              }}>
                {services.map((svc) => <ServiceCard key={svc.id} service={svc} />)}
              </div>
            </section>

            <div className="two-col" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 340px',
              gap: '1.25rem',
            }}>
              <section>
                <SectionHeader label="ACTIVE INCIDENTS" count={activeIncidents.length} alert={activeIncidents.length > 0} />
                <div style={{ marginTop: '0.875rem' }}>
                  <IncidentTable incidents={activeIncidents} onResolve={fetchData} />
                </div>
              </section>
              <section>
                <SectionHeader label="SENTINEL AGENTS" />
                <div style={{ marginTop: '0.875rem' }}>
                  <AgentStatus incidents={incidents} services={services} />
                </div>
              </section>
            </div>

            <section>
              <SectionHeader label="POSTMORTEMS" count={resolvedIncidents.length} />
              <div style={{ marginTop: '0.875rem' }}>
                <PostmortemPanel />
              </div>
            </section>

            <section>
              <SectionHeader label="INCIDENT TIMELINE" count={incidents.length} />
              <div style={{ marginTop: '0.875rem' }}>
                <IncidentTimeline incidents={incidents} />
              </div>
            </section>

            <section>
              <SectionHeader label="RESOLVED BY SENTINEL" count={resolvedIncidents.length} />
              <div style={{ marginTop: '0.875rem' }}>
                <IncidentTable incidents={resolvedIncidents.slice(0, 10)} resolved />
              </div>
            </section>

          </div>
        )}
      </main>
    </div>
  );
}

function SectionHeader({ label, count, alert }: { label: string; count?: number; alert?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
        color: alert ? 'var(--accent-red)' : 'var(--text-muted)', letterSpacing: '0.12em',
        whiteSpace: 'nowrap',
      }}>{label}</span>
      {count !== undefined && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px',
          background: alert ? 'rgba(255,71,87,0.15)' : 'var(--bg-elevated)',
          color: alert ? 'var(--accent-red)' : 'var(--text-secondary)',
          padding: '1px 7px', borderRadius: '10px',
          border: `1px solid ${alert ? 'rgba(255,71,87,0.3)' : 'var(--border-default)'}`,
        }}>{count}</span>
      )}
      <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '60vh', gap: '16px',
    }}>
      <div style={{
        width: '40px', height: '40px', border: '2px solid var(--border-default)',
        borderTopColor: 'var(--accent-cyan)', borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '11px' }}>
        CONNECTING TO SENTINEL...
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '60vh', gap: '10px',
    }}>
      <div style={{ fontSize: '28px' }}>⚠️</div>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-red)', fontSize: '12px' }}>
        DATABASE CONNECTION FAILED
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '10px' }}>
        {error}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '10px', marginTop: '6px' }}>
        Run: pnpm monitor:init — then restart dashboard
      </span>
    </div>
  );
}
