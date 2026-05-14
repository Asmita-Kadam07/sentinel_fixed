'use client';

import type { Incident } from '@sentinel/shared';

const STATUS_DOT: Record<string, string> = {
  OPEN: 'var(--accent-red)',
  IN_PROGRESS: 'var(--accent-amber)',
  RESOLVED: 'var(--accent-green)',
  UNRESOLVED: 'var(--accent-purple)',
};

export function IncidentTimeline({ incidents }: { incidents: Incident[] }) {
  const sorted = [...incidents].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 15);

  if (sorted.length === 0) {
    return (
      <div style={{
        padding: '2rem', textAlign: 'center',
        background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)',
      }}>
        No incident history yet
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)', padding: '1.25rem',
      position: 'relative',
    }}>
      {sorted.map((inc, idx) => {
        const dotColor = STATUS_DOT[inc.status] ?? 'var(--text-muted)';
        const duration = inc.resolvedAt
          ? formatDuration(new Date(inc.createdAt), new Date(inc.resolvedAt))
          : null;

        return (
          <div key={inc.id} style={{
            display: 'grid',
            gridTemplateColumns: '20px 1fr auto',
            gap: '12px',
            position: 'relative',
            paddingBottom: idx < sorted.length - 1 ? '16px' : '0',
            animation: `slide-in 0.2s ease-out ${idx * 0.04}s both`,
          }}>
            {/* Timeline spine */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: dotColor,
                boxShadow: `0 0 6px ${dotColor}80`,
                flexShrink: 0, marginTop: '3px',
              }} />
              {idx < sorted.length - 1 && (
                <div style={{
                  width: '1px', flex: 1, background: 'var(--border-subtle)',
                  marginTop: '4px',
                }} />
              )}
            </div>

            {/* Content */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {inc.serviceName.split('(')[0]?.trim()}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '9px',
                  color: dotColor, letterSpacing: '0.06em',
                }}>{inc.status.replace('_', ' ')}</span>
                {inc.errorType && (
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '9px',
                    color: 'var(--text-muted)', background: 'var(--bg-elevated)',
                    padding: '1px 5px', borderRadius: '3px',
                  }}>{inc.errorType.replace(/_/g, ' ')}</span>
                )}
              </div>
              {inc.fixApplied && (
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)',
                  marginTop: '2px',
                }}>
                  ↳ {inc.fixApplied.slice(0, 80)}{inc.fixApplied.length > 80 ? '...' : ''}
                </div>
              )}
            </div>

            {/* Time */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                {formatRelative(inc.createdAt)}
              </div>
              {duration && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-green)' }}>
                  ✓ {duration}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDuration(start: Date, end: Date): string {
  const secs = Math.round((end.getTime() - start.getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}
