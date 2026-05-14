import { createLogger } from '../../packages/shared/src/logger.js';

const logger = createLogger('service-c');

interface ReportConfig {
  title: string;
  period: 'daily' | 'weekly' | 'monthly';
  includeCharts: boolean;
  maxRows: number;
}

interface ReportData {
  label: string;
  value: number;
  change: number;
}

interface GeneratedReport {
  reportId: string;
  title: string;
  period: string;
  rowCount: number;
  summary: string;
  generatedAt: string;
}

const DEFAULT_MAX_ROWS = 100;

function generateReportId(): string {
  return `RPT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function summarizeData(data: ReportData[]): string {
  if (data.length === 0) return 'No data available';

  const total = data.reduce((sum, row) => sum + row.value, 0);
  const avg = total / data.length;
  const maxItem = data.reduce((max, row) => (row.value > max.value ? row : max), data[0] as ReportData);

  return `Total: ${total.toFixed(2)} | Avg: ${avg.toFixed(2)} | Peak: ${maxItem.label} (${maxItem.value})`;
}

export function generateReport(config: ReportConfig, data: ReportData[]): GeneratedReport {
  logger.info(`Generating ${config.period} report: "${config.title}"`);

  if (!config.title || config.title.trim().length === 0) {
    throw new Error('Report title cannot be empty');
  }

  const maxRows = config.maxRows > 0 ? config.maxRows : DEFAULT_MAX_ROWS;
  const limitedData = data.slice(0, maxRows);
  const summary = summarizeData(limitedData);

  const report: GeneratedReport = {
    reportId: generateReportId(),
    title: config.title.trim(),
    period: config.period,
    rowCount: limitedData.length,
    summary,
    generatedAt: new Date().toISOString(),
  };

  logger.info(`Report generated: ${report.reportId} | rows: ${report.rowCount}`);
  return report;
}

export function parseReportConfig(jsonString: string): ReportConfig {
  try {
    const raw = JSON.parse(jsonString) as Partial<ReportConfig>;
    if (!raw.title || !raw.period) {
      throw new Error('Missing required fields: title, period');
    }
    return {
      title: raw.title,
      period: raw.period,
      includeCharts: raw.includeCharts ?? false,
      maxRows: raw.maxRows ?? DEFAULT_MAX_ROWS,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.critical(`Failed to parse report config: ${message}`);
    throw new Error(`Invalid report config: ${message}`);
  }
}

// Self-test
try {
  const config = parseReportConfig('{"title":"Daily Summary","period":"daily","maxRows":10}');
  const data: ReportData[] = [
    { label: 'Alpha', value: 450, change: 12 },
    { label: 'Beta', value: 320, change: -5 },
    { label: 'Gamma', value: 590, change: 23 },
  ];
  const report = generateReport(config, data);
  logger.info(`Service C startup OK — report: ${report.reportId}`);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  logger.critical(`Service C startup FAILED: ${message}`);
}
