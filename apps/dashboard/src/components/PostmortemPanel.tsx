'use client';

import { useState, useEffect } from 'react';
import type { PostmortemData } from '@/app/api/postmortem/route';

export function PostmortemPanel() {
  const [postmortems, setPostmortems] = useState<PostmortemData[]>([]);
  const [selected, setSelected] = useState<PostmortemData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/postmortem')
      .then((r) => r.json())
      .then((data: { postmortems?: PostmortemData[] }) => {
        setPostmortems(data.postmortems ?? []);
      })
      .catch(() => setPostmortems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)', padding: '1.5rem', textAlign: 'center',
        fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)',
      }}>
        Loading postmortems...
      </div>
    );
  }

  if (postmortems.length === 0) {
    return (
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)', padding: '2rem', textAlign: 'center',
        fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)',
      }}>
        No postmortems yet — resolve an incident to generate one.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '280px 1fr' : '1fr', gap: '1rem' }}>
      {/* List */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)', overflow: 'hidden',
      }}>
        {postmortems.map((pm, idx) => (
          <button
            key={pm.incidentId}
            onClick={() => setSelected(selected?.incidentId === pm.incidentId ? null : pm)}
            style={{
              width: '100%', textAlign: 'left', padding: '10px 14px',
              background: selected?.incidentId === pm.incidentId ? 'var(--bg-elevated)' : 'transparent',
              border: 'none',
              borderBottom: idx < postmortems.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              cursor: 'pointer', display: 'block',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-cyan)', marginBottom: '3px' }}>
              {pm.incidentId.slice(0, 8)}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
              {pm.service.split('(')[0]?.trim()}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>
              {pm.errorType.replace(/_/g, ' ')}
              {pm.durationSeconds !== null ? ` · ${pm.durationSeconds}s` : ''}
            </div>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)', padding: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: '14px',
          animation: 'slide-in 0.2s ease-out',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {selected.service.split('(')[0]?.trim()}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {selected.incidentId}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Chip label={selected.errorType.replace(/_/g, ' ')} color="var(--accent-amber)" />
              {selected.thinkingModeUsed && <Chip label="🧠 THINKING MODE" color="var(--accent-purple)" />}
              {selected.testsPass && <Chip label="✓ TESTS PASS" color="var(--accent-green)" />}
            </div>
          </div>

          <DetailRow label="DESCRIPTION" value={selected.description} />
          {selected.fixApplied && <DetailRow label="FIX APPLIED" value={selected.fixApplied} />}
          <DetailRow label="DURATION" value={selected.durationSeconds !== null ? `${selected.durationSeconds}s` : 'N/A'} />
          <DetailRow label="RETRY ATTEMPTS" value={String(selected.retryCount)} />

          {selected.history.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '8px' }}>
                RESOLUTION HISTORY
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selected.history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '1px' }}>
                      {h.action}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>
                      {h.description.slice(0, 100)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selected.prevention.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '8px' }}>
                PREVENTION ACTIONS
              </div>
              {selected.prevention.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--accent-green)', fontSize: '11px', flexShrink: 0 }}>→</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>{p}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700,
      color, background: `${color}18`,
      border: `1px solid ${color}30`,
      padding: '2px 7px', borderRadius: '10px',
    }}>
      {label}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '3px' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
        {value}
      </div>
    </div>
  );
}
