import { appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { LogEntry, LogLevel } from './types.js';

const LOG_DIR = join(process.cwd(), 'services', 'logs');

function ensureDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

export function createLogger(serviceName: string) {
  const logFile = join(LOG_DIR, `${serviceName}.log`);

  function writeLog(level: LogLevel, message: string, meta?: Partial<LogEntry>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      service: serviceName,
      level,
      message,
      ...meta,
    };
    ensureDir(logFile);
    appendFileSync(logFile, JSON.stringify(entry) + '\n');
    const prefix = `[${entry.timestamp}] [${level}] [${serviceName}]`;
    if (level === 'ERROR' || level === 'CRITICAL') {
      console.error(`${prefix} ${message}`);
    } else if (level === 'WARN') {
      console.warn(`${prefix} ${message}`);
    } else {
      console.info(`${prefix} ${message}`);
    }
  }

  return {
    info: (msg: string, meta?: Partial<LogEntry>) => writeLog('INFO', msg, meta),
    warn: (msg: string, meta?: Partial<LogEntry>) => writeLog('WARN', msg, meta),
    error: (msg: string, meta?: Partial<LogEntry>) => writeLog('ERROR', msg, meta),
    critical: (msg: string, meta?: Partial<LogEntry>) => writeLog('CRITICAL', msg, meta),
  };
}
