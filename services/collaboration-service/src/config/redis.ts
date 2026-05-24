import Redis from 'ioredis';

export let redis: Redis;

export async function connectRedis() {
  try {
    const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      enableOfflineQueue: false,
    });
    redis.on('error', (err) => console.warn('[collaboration-service] Redis error:', err.message));
    await redis.ping();
    console.log('[collaboration-service] Redis connected');
  } catch (err) {
    console.warn('[collaboration-service] Redis unavailable:', (err as Error).message);
    redis = new Proxy({} as Redis, { get: () => async () => null });
  }
}
