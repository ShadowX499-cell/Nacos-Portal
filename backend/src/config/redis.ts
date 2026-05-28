import Redis from 'ioredis';
import { env } from './env';

const globalForRedis = global as unknown as { redis: Redis };

function createRedisClient(): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableReadyCheck: true,
  });

  client.on('error', (err) => {
    if (env.NODE_ENV !== 'test') {
      console.error('Redis error:', err.message);
    }
  });

  client.on('connect', () => {
    if (env.NODE_ENV === 'development') {
      console.log('Redis client connected');
    }
  });

  return client;
}

export const redis: Redis =
  globalForRedis.redis ?? createRedisClient();

if (env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

// ── Key helpers ───────────────────────────────────────────────────────────────

/** Stores a refresh token: value = userId, TTL = 7 days */
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/** Stores a password-reset token: value = userId, TTL = 30 min */
export const RESET_TTL_SECONDS = 30 * 60;

export const redisKeys = {
  refreshToken: (token: string) => `refresh:${token}`,
  resetToken: (token: string) => `reset:${token}`,
  loginAttempts: (userId: string) => `loginAttempts:${userId}`,
  accountLock: (userId: string) => `accountLock:${userId}`,
  voteLock: (electionId: string, voterId: string, position: string) =>
    `vote:lock:${electionId}:${voterId}:${position}`,
};
