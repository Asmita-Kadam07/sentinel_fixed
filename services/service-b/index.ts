import { createLogger } from '../../packages/shared/src/logger.js';

const logger = createLogger('service-b');

interface AuthRequest {
  userId: string;
  token: string;
  permissions: string[];
}

interface AuthResult {
  userId: string;
  isValid: boolean;
  grantedPermissions: string[];
  expiresAt: string;
}

const VALID_TOKEN_PREFIX = 'sentinel_';
const TOKEN_EXPIRY_HOURS = 24;

function validateToken(token: string): boolean {
  return token.startsWith(VALID_TOKEN_PREFIX) && token.length >= 16;
}

function computeExpiry(): string {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + TOKEN_EXPIRY_HOURS);
  return expiry.toISOString();
}

export function authenticateRequest(request: AuthRequest): AuthResult {
  logger.info(`Auth request for user: ${request.userId}`);

  if (!request.userId || request.userId.trim().length === 0) {
    throw new Error('userId cannot be empty');
  }

  const isValid = validateToken(request.token);

  if (!isValid) {
    logger.warn(`Invalid token for user ${request.userId}`);
    return {
      userId: request.userId,
      isValid: false,
      grantedPermissions: [],
      expiresAt: new Date().toISOString(),
    };
  }

  const allowedPermissions = ['read', 'write', 'admin'];
  const grantedPermissions = request.permissions.filter((p) => allowedPermissions.includes(p));

  logger.info(`Auth success for ${request.userId} | permissions: ${grantedPermissions.join(', ')}`);

  return {
    userId: request.userId,
    isValid: true,
    grantedPermissions,
    expiresAt: computeExpiry(),
  };
}

export function parseAuthConfig(configJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(configJson) as Record<string, unknown>;
    logger.info('Auth config parsed successfully');
    return parsed;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.critical(`Failed to parse auth config JSON: ${message}`);
    throw new Error(`Corrupted auth config: ${message}`);
  }
}

// Self-test
try {
  const result = authenticateRequest({
    userId: 'test-user',
    token: 'sentinel_test_token_12345',
    permissions: ['read', 'write'],
  });
  logger.info(`Service B startup OK — auth test: ${result.isValid}`);
  parseAuthConfig('{"maxRetries": 3, "timeout": 5000}');
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  logger.critical(`Service B startup FAILED: ${message}`);
}
