'use client';

import type { Incident, Service } from '@sentinel/shared';

export function AgentStatus({ incidents, services }: { incidents: Incident[]; services: Service[] }) {
  const criticalServices = services.filter((s) => s.status === 'CRITICAL');
  const investigatingServices = services.filter((s) => s.status === 'INVESTIGATING');
  const inProgress = incidents.filter((i) => i.status === 'IN_PROGRESS');
  const resolvedToday = incidents.filter(
    (i) => i.status === 'RESOLVED' && isToday(i.resolvedAt)
  );

  const mainAgentStatus = criticalServices.length > 0 ? 'ACTIVE' : inProgress.length > 0 ? 'BUSY' : 'IDLE';
  const alphaStatus = investigatingServices.length > 0 || inProgress.length > 0 ? 'DEBUGGING' : 'STANDBY';
  const betaStatus = inProgress.length > 0 ? 'TESTING' : 'STANDBY';

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      <AgentRow
        name="MAIN AGENT"
        role="Orchestrator · Dashboard"
        status={mainAgentStatus}
        detail={criticalServices.length > 0 ? `Coordinating ${criticalServices.length} critical alert(s)` : 'Monitoring all services'}
      />
      <div style={{ height: '1px', background: 'var(--border-subtle)' }} />
      <AgentRow
        name="SUBAGENT ALPHA"
        role="Debugger · Log Analysis"
        status={alphaStatus}
        detail={alphaStatus === 'DEBUGGING' ? 'Tracing root cause in service logs' : 'Ready to diagnose'}
      />
      <div style={{ height: '1px', background: 'var(--border-subtle)' }} />
      <AgentRow
        name="SUBAGENT BETA"
        role="QA Engineer · Regression"
        status={betaStatus}
        detail={betaStatus === 'TESTING' ? 'Running regression test suite' : 'Ready to test'}
      />

      <div style={{ height: '1px', background: 'var(--border-subtle)', marginTop: '4px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <MiniMetric label="FIXES TODAY" value={String(resolvedToday.length)} color="var(--accent-green)" />
        <MiniMetric label="IN PROGRESS" value={String(inProgress.length)} color="var(--accent-amber)" />
      </div>
    </div>
  );
}

function AgentRow({ name, role, status, detail }: {
  name: string; role: string; status: string; detail: string;
}) {
  const isActive = status !== 'IDLE' && status !== 'STANDBY';
  const statusColor = status === 'ACTIVE' || status === 'DEBUGGING' || status === 'TESTING' || status === 'BUSY'
    ? 'var(--accent-cyan)' : 'var(--text-muted)';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: statusColor,
            animation: isActive ? 'blink 1.5s infinite' : 'none',
          }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: statusColor, letterSpacing: '0.06em' }}>
            {status}
          </span>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>
        {role}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>
        {detail}
      </div>
    </div>
  );
}

function MiniMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '8px',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}
