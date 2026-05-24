import Redis from 'ioredis';

export let redis: Redis;

export async function connectRedis() {
  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    await redis.connect();
    await redis.ping();
    console.log('[auth-service] Redis connected');
  } catch (err) {
    console.warn('[auth-service] Redis unavailable — session caching disabled:', (err as Error).message);
    // Provide a no-op redis so the rest of the service still works
    redis = new Proxy({} as Redis, {
      get: () => async (..._args: unknown[]) => null,
    });
  }
}
