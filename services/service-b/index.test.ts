import { describe, it, expect } from 'vitest';
import { authenticateRequest, parseAuthConfig } from './index.js';

describe('Service B - Auth Handler', () => {
  it('authenticates valid token', () => {
    const result = authenticateRequest({
      userId: 'user-123',
      token: 'sentinel_valid_token_xyz',
      permissions: ['read'],
    });
    expect(result.isValid).toBe(true);
    expect(result.grantedPermissions).toContain('read');
  });

  it('rejects invalid token', () => {
    const result = authenticateRequest({
      userId: 'user-123',
      token: 'bad_token',
      permissions: ['read'],
    });
    expect(result.isValid).toBe(false);
    expect(result.grantedPermissions).toHaveLength(0);
  });

  it('throws on empty userId', () => {
    expect(() =>
      authenticateRequest({ userId: '', token: 'sentinel_abc123456', permissions: [] })
    ).toThrow('userId cannot be empty');
  });

  it('filters invalid permissions', () => {
    const result = authenticateRequest({
      userId: 'user-1',
      token: 'sentinel_valid_token_xyz',
      permissions: ['read', 'superpower', 'write'],
    });
    expect(result.grantedPermissions).toEqual(['read', 'write']);
  });

  it('parses valid auth config JSON', () => {
    const config = parseAuthConfig('{"maxRetries": 3}');
    expect(config['maxRetries']).toBe(3);
  });

  it('throws on corrupted JSON', () => {
    expect(() => parseAuthConfig('{ corrupted json ][')).toThrow('Corrupted auth config');
  });
});
