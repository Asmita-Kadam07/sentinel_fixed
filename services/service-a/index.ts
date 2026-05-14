import { createLogger } from '../../packages/shared/src/logger.js';

const logger = createLogger('service-a');

interface DataRecord {
  id: string;
  value: number;
  label: string;
}

interface ProcessedResult {
  recordId: string;
  computed: number;
  normalizedLabel: string;
  processedAt: string;
}

function processRecord(record: DataRecord): ProcessedResult {
  if (record.value < 0) {
    throw new Error(`Invalid negative value for record ${record.id}`);
  }

  const computed = Math.sqrt(record.value) * 100;
  const normalizedLabel = record.label.trim().toLowerCase().replace(/\s+/g, '-');

  return {
    recordId: record.id,
    computed: Math.round(computed * 100) / 100,
    normalizedLabel,
    processedAt: new Date().toISOString(),
  };
}

export function runDataProcessor(records: DataRecord[]): ProcessedResult[] {
  logger.info(`Processing ${records.length} records`);

  const results: ProcessedResult[] = [];

  for (const record of records) {
    try {
      const result = processRecord(record);
      results.push(result);
      logger.info(`Processed record ${record.id}: computed=${result.computed}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to process record ${record.id}: ${message}`, {
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  }

  logger.info(`Successfully processed ${results.length}/${records.length} records`);
  return results;
}

// Self-test on startup
const testRecords: DataRecord[] = [
  { id: 'rec-001', value: 144, label: 'Alpha Data' },
  { id: 'rec-002', value: 256, label: 'Beta Data' },
  { id: 'rec-003', value: 81, label: 'Gamma Data' },
];

try {
  const results = runDataProcessor(testRecords);
  logger.info(`Service A startup OK — processed ${results.length} test records`);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  logger.critical(`Service A startup FAILED: ${message}`, {
    stack: err instanceof Error ? err.stack : undefined,
  });
}
