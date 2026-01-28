import { createClient, RedisClientType } from 'redis';
import { config } from '../config.js';

let client: RedisClientType | null = null;

export function getRedisClient(): RedisClientType {
  if (!client) {
    throw new Error('Redis not initialized. Call initRedis() first.');
  }
  return client;
}

export async function initRedis(): Promise<void> {
  client = createClient({
    url: config.redis.url,
  });

  client.on('error', (err) => {
    console.error('Redis error:', err);
  });

  await client.connect();
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
