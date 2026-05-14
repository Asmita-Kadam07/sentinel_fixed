'use client';

import type { Service, ServiceStatus } from '@sentinel/shared';

const STATUS_CONFIG: Record<ServiceStatus, { color: string; bg: string; glow: string; icon: string; label: string }> = {
  HEALTHY: { color: 'var(--accent-green)', bg: 'rgba(57,211,83,0.08)', glow: 'var(--glow-green)', icon: '●', label: 'HEALTHY' },
  CRITICAL: { color: 'var(--accent-red)', bg: 'rgba(255,71,87,0.08)', glow: 'var(--glow-red)', icon: '▲', label: 'CRITICAL' },
  INVESTIGATING: { color: 'var(--accent-amber)', bg: 'rgba(255,165,2,0.08)', glow: '0 0 20px rgba(255,165,2,0.15)', icon: '◐', label: 'INVESTIGATING' },
  RESOLVED: { color: 'var(--accent-blue)', bg: 'rgba(88,166,255,0.08)', glow: '0 0 20px rgba(88,166,255,0.1)', icon: '✓', label: 'RESOLVED' },
};

export function ServiceCard({ service }: { service: Service }) {
  const cfg = STATUS_CONFIG[service.status];
  const timeAgo = getTimeAgo(service.lastChecked);
  const isCritical = service.status === 'CRITICAL';

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${isCritical ? 'rgba(255,71,87,0.3)' : 'var(--border-subtle)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '1rem 1.25rem',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: isCritical ? cfg.glow : 'none',
      animation: 'slide-in 0.3s ease-out',
      transition: 'border-color 0.3s, box-shadow 0.3s',
    }}>
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: cfg.color,
        opacity: isCritical ? 1 : 0.4,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '13px',
            color: 'var(--text-primary)',
            marginBottom: '4px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {service.name}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--text-muted)',
          }}>
            {service.id} · {timeAgo}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: cfg.bg,
          border: `1px solid ${cfg.color}30`,
          borderRadius: 'var(--radius-sm)',
          padding: '3px 8px',
          flexShrink: 0,
        }}>
          <span style={{
            color: cfg.color,
            fontSize: '8px',
            animation: isCritical ? 'blink 1s infinite' : undefined,
          }}>{cfg.icon}</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 700,
            color: cfg.color,
            letterSpacing: '0.08em',
          }}>{cfg.label}</span>
        </div>
      </div>

      {service.lastError && (
        <div style={{
          marginTop: '10px',
          padding: '8px 10px',
          background: 'rgba(255,71,87,0.06)',
          border: '1px solid rgba(255,71,87,0.15)',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--accent-red)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {service.lastError}
        </div>
      )}

      <div style={{
        marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <Metric label="ERRORS" value={String(service.errorCount)} />
        <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />
        <Metric label="STATUS" value={cfg.label} color={cfg.color} />
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700,
        color: color ?? 'var(--text-secondary)',
      }}>
        {value}
      </div>
    </div>
  );
}

function getTimeAgo(isoString: string): string {
  if (!isoString) return 'never';
  const diff = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}
