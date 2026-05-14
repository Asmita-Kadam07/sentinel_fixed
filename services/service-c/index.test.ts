import { describe, it, expect } from 'vitest';
import { generateReport, parseReportConfig } from './index.js';

describe('Service C - Report Generator', () => {
  const validConfig = { title: 'Test Report', period: 'daily' as const, includeCharts: false, maxRows: 10 };
  const sampleData = [
    { label: 'Alpha', value: 100, change: 5 },
    { label: 'Beta', value: 200, change: -3 },
  ];

  it('generates a report with correct structure', () => {
    const report = generateReport(validConfig, sampleData);
    expect(report.reportId).toMatch(/^RPT-/);
    expect(report.title).toBe('Test Report');
    expect(report.rowCount).toBe(2);
    expect(report.period).toBe('daily');
  });

  it('limits rows to maxRows', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ label: `item-${i}`, value: i, change: 0 }));
    const report = generateReport({ ...validConfig, maxRows: 5 }, data);
    expect(report.rowCount).toBe(5);
  });

  it('throws on empty title', () => {
    expect(() => generateReport({ ...validConfig, title: '' }, sampleData)).toThrow('Report title cannot be empty');
  });

  it('parses valid config JSON', () => {
    const config = parseReportConfig('{"title":"Weekly","period":"weekly","maxRows":50}');
    expect(config.title).toBe('Weekly');
    expect(config.period).toBe('weekly');
  });

  it('throws on invalid config JSON', () => {
    expect(() => parseReportConfig('{ bad json }')).toThrow('Invalid report config');
  });

  it('handles empty data array', () => {
    const report = generateReport(validConfig, []);
    expect(report.summary).toBe('No data available');
  });
});
