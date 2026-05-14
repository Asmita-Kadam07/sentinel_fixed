import { describe, it, expect } from 'vitest';
import { runDataProcessor } from './index.js';

describe('Service A - Data Processor', () => {
  it('processes valid records correctly', () => {
    const records = [
      { id: 'r1', value: 100, label: 'Test Record' },
      { id: 'r2', value: 64, label: 'Another Record' },
    ];
    const results = runDataProcessor(records);
    expect(results).toHaveLength(2);
    expect(results[0]?.computed).toBe(1000);
    expect(results[0]?.normalizedLabel).toBe('test-record');
  });

  it('computes sqrt * 100 correctly', () => {
    const records = [{ id: 'r1', value: 144, label: 'X' }];
    const [result] = runDataProcessor(records);
    expect(result?.computed).toBe(1200);
  });

  it('normalizes labels correctly', () => {
    const records = [{ id: 'r1', value: 4, label: '  Hello   World  ' }];
    const [result] = runDataProcessor(records);
    expect(result?.normalizedLabel).toBe('hello-world');
  });

  it('throws on negative values', () => {
    const records = [{ id: 'r1', value: -1, label: 'Bad' }];
    expect(() => runDataProcessor(records)).toThrow('Invalid negative value');
  });

  it('processes empty array', () => {
    const results = runDataProcessor([]);
    expect(results).toHaveLength(0);
  });
});
