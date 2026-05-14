'use client';

import { useState } from 'react';
import type { Incident } from '@sentinel/shared';

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  OPEN: { bg: 'rgba(255,71,87,0.12)', color: 'var(--accent-red)' },
  IN_PROGRESS: { bg: 'rgba(255,165,2,0.12)', color: 'var(--accent-amber)' },
  RESOLVED: { bg: 'rgba(57,211,83,0.12)', color: 'var(--accent-green)' },
  UNRESOLVED: { bg: 'rgba(189,147,249,0.12)', color: 'var(--accent-purple)' },
};

const ERROR_TYPE_COLOR: Record<string, string> = {
  SYNTAX_ERROR: 'var(--accent-red)',
  TYPE_MISMATCH: 'var(--accent-amber)',
  LOGIC_BUG: 'var(--accent-purple)',
  MISSING_DEPENDENCY: 'var(--accent-cyan)',
  CORRUPTED_DATA: 'var(--accent-blue)',
};

export function IncidentTable({
  incidents,
  resolved = false,
  onResolve,
}: {
  incidents: Incident[];
  resolved?: boolean;
  onResolve?: () => void;
}) {
  const [triggering, setTriggering] = useState<string | null>(null);

  if (incidents.length === 0) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        color: 'var(--text-muted)',
      }}>
        {resolved ? 'No resolved incidents yet' : '✅ No active incidents'}
      </div>
    );
  }

  async function triggerResolve(incidentId: string) {
    setTriggering(incidentId);
    try {
      await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId }),
      });
      onResolve?.();
    } finally {
      setTriggering(null);
    }
  }

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: resolved
          ? '80px 1fr 140px 100px 1fr'
          : '80px 1fr 140px 100px 100px',
        gap: 0,
        padding: '8px 16px',
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        {['ID', 'SERVICE', 'ERROR TYPE', 'STATUS', resolved ? 'FIX APPLIED' : 'ACTION'].map((h) => (
          <div key={h} style={{
            fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)',
            letterSpacing: '0.1em', fontWeight: 700,
          }}>{h}</div>
        ))}
      </div>

      {incidents.map((inc, idx) => {
        const badge = STATUS_BADGE[inc.status] ?? STATUS_BADGE['OPEN'];
        const errorColor = ERROR_TYPE_COLOR[inc.errorType] ?? 'var(--text-secondary)';

        return (
          <div key={inc.id} style={{
            display: 'grid',
            gridTemplateColumns: resolved
              ? '80px 1fr 140px 100px 1fr'
              : '80px 1fr 140px 100px 100px',
            gap: 0,
            padding: '10px 16px',
            borderBottom: idx < incidents.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            alignItems: 'center',
            animation: `slide-in 0.2s ease-out ${idx * 0.05}s both`,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
              {inc.id.slice(0, 7)}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 700 }}>
                {inc.serviceName.split('(')[0]?.trim()}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>
                {formatTime(inc.createdAt)}
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
              color: errorColor,
            }}>
              {inc.errorType.replace(/_/g, ' ')}
            </div>
            <div>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700,
                background: badge?.bg, color: badge?.color,
                padding: '2px 7px', borderRadius: '10px',
              }}>
                {inc.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              {resolved ? (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                  {inc.fixApplied ? inc.fixApplied.slice(0, 30) + '...' : '—'}
                </span>
              ) : (
                inc.status === 'OPEN' && (
                  <button
                    onClick={() => void triggerResolve(inc.id)}
                    disabled={triggering === inc.id}
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
                      background: 'rgba(0,229,255,0.1)', color: 'var(--accent-cyan)',
                      border: '1px solid rgba(0,229,255,0.3)', borderRadius: 'var(--radius-sm)',
                      padding: '3px 10px', cursor: 'pointer',
                      opacity: triggering === inc.id ? 0.5 : 1,
                    }}
                  >
                    {triggering === inc.id ? 'QUEUED...' : '⚡ RESOLVE'}
                  </button>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
