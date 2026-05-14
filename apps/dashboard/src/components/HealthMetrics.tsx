'use client';

import type { SystemHealth } from '@sentinel/shared';

export function HealthMetrics({ health }: { health: SystemHealth }) {
  const metrics = [
    { label: 'UPTIME', value: `${health.uptimePercent}%`, color: health.uptimePercent >= 80 ? 'var(--accent-green)' : 'var(--accent-red)', large: true },
    { label: 'HEALTHY', value: String(health.healthyCount), color: 'var(--accent-green)' },
    { label: 'CRITICAL', value: String(health.criticalCount), color: health.criticalCount > 0 ? 'var(--accent-red)' : 'var(--text-muted)' },
    { label: 'INVESTIGATING', value: String(health.investigatingCount), color: health.investigatingCount > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' },
    { label: 'ACTIVE INCIDENTS', value: String(health.activeIncidents), color: health.activeIncidents > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' },
    { label: 'RESOLVED TODAY', value: String(health.resolvedToday), color: 'var(--accent-cyan)' },
    { label: 'TOTAL SERVICES', value: String(health.totalServices), color: 'var(--text-secondary)' },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '1px',
      background: 'var(--border-subtle)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
    }}>
      {metrics.map((m) => (
        <div key={m.label} style={{
          background: 'var(--bg-surface)',
          padding: '1.25rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--text-muted)',
            letterSpacing: '0.12em',
          }}>{m.label}</div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: m.large ? '28px' : '22px',
            color: m.color,
            lineHeight: 1,
            animation: 'counter-up 0.4s ease-out',
          }}>{m.value}</div>
        </div>
      ))}
    </div>
  );
}
