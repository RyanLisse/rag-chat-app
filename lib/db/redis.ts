import { createClient, type RedisClientType } from 'redis';

// Initialize Redis client with optional configuration
// Falls back gracefully if Redis is not configured
let redisClient: RedisClientType | null = null;

async function initRedis() {
  if (process.env.REDIS_URL) {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL,
      });
      
      redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });
      
      await redisClient.connect();
      console.log('Redis connected successfully');
      return redisClient;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      return null;
    }
  }
  return null;
}

// Initialize Redis on module load
const redisPromise = initRedis();

// Export a wrapper that ensures Redis is initialized
export const redis = {
  async get(key: string): Promise<string | null> {
    const client = await redisPromise;
    if (!client) return null;
    const result = await client.get(key);
    return typeof result === 'string' ? result : null;
  },
  
  async set(key: string, value: string, mode?: 'EX', duration?: number): Promise<void> {
    const client = await redisPromise;
    if (!client) return;
    if (mode === 'EX' && duration) {
      await client.setEx(key, duration, value);
    } else {
      await client.set(key, value);
    }
  },
  
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const client = await redisPromise;
    if (!client) return [];
    return client.lRange(key, start, stop);
  },
  
  async lpush(key: string, ...values: string[]): Promise<number> {
    const client = await redisPromise;
    if (!client) return 0;
    return client.lPush(key, values);
  },
  
  async ltrim(key: string, start: number, stop: number): Promise<void> {
    const client = await redisPromise;
    if (!client) return;
    await client.lTrim(key, start, stop);
  },
  
  async expire(key: string, seconds: number): Promise<void> {
    const client = await redisPromise;
    if (!client) return;
    await client.expire(key, seconds);
  },
};

// Helper to check if Redis is available
export const isRedisAvailable = () => redis !== null;

// Helper to safely execute Redis operations
export async function safeRedisOperation<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!redis) {
    return fallback;
  }

  try {
    return await operation();
  } catch (error) {
    console.error('Redis operation failed:', error);
    return fallback;
  }
}