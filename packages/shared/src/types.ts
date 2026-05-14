export type ServiceStatus = 'HEALTHY' | 'INVESTIGATING' | 'CRITICAL' | 'RESOLVED';

export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'UNRESOLVED';

export type ErrorType =
  | 'SYNTAX_ERROR'
  | 'TYPE_MISMATCH'
  | 'LOGIC_BUG'
  | 'MISSING_DEPENDENCY'
  | 'CORRUPTED_DATA';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface Service {
  id: string;
  name: string;
  status: ServiceStatus;
  lastChecked: string;
  lastError: string | null;
  errorCount: number;
}

export interface Incident {
  id: string;
  serviceId: string;
  serviceName: string;
  errorType: ErrorType;
  description: string;
  status: IncidentStatus;
  createdAt: string;
  resolvedAt: string | null;
  fixApplied: string | null;
  testsPass: boolean | null;
  retryCount: number;
}

export interface LogEntry {
  timestamp: string;
  service: string;
  level: LogLevel;
  message: string;
  incidentId?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

export interface ResolutionResult {
  success: boolean;
  incidentId: string;
  fixDescription: string;
  testsPass: boolean;
  rollbackRequired: boolean;
}

export interface SystemHealth {
  totalServices: number;
  healthyCount: number;
  criticalCount: number;
  investigatingCount: number;
  resolvedToday: number;
  activeIncidents: number;
  uptimePercent: number;
}

export interface PostmortemSummary {
  incidentId: string;
  service: string;
  duration: string;
  rootCause: string;
  fixApplied: string;
  preventionSteps: string[];
  generatedAt: string;
}
