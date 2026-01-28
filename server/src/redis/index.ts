import { Redis, type RedisOptions } from "ioredis";

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
}

let redisClient: Redis | null = null;
let redisPub: Redis | null = null;
let redisSub: Redis | null = null;

function getRedisOptions(config?: RedisConfig): RedisOptions {
  const url = config?.url || process.env.REDIS_URL;

  if (url) {
    return {
      lazyConnect: true,
    };
  }

  return {
    host: config?.host || process.env.REDIS_HOST || "localhost",
    port: config?.port || parseInt(process.env.REDIS_PORT || "6379", 10),
    password: config?.password || process.env.REDIS_PASSWORD || undefined,
    lazyConnect: true,
  };
}

export function createRedisClient(config?: RedisConfig): Redis {
  const url = config?.url || process.env.REDIS_URL;
  const options = getRedisOptions(config);

  if (url) {
    return new Redis(url, options);
  }

  return new Redis(options);
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

export function getRedisPub(): Redis {
  if (!redisPub) {
    redisPub = createRedisClient();
  }
  return redisPub;
}

export function getRedisSub(): Redis {
  if (!redisSub) {
    redisSub = createRedisClient();
  }
  return redisSub;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  await client.connect();
}

export async function closeRedis(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  if (redisClient) {
    closePromises.push(
      redisClient.quit().then(() => {
        redisClient = null;
      })
    );
  }

  if (redisPub) {
    closePromises.push(
      redisPub.quit().then(() => {
        redisPub = null;
      })
    );
  }

  if (redisSub) {
    closePromises.push(
      redisSub.quit().then(() => {
        redisSub = null;
      })
    );
  }

  await Promise.all(closePromises);
}

export async function testRedisConnection(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const pong = await client.ping();
    return pong === "PONG";
  } catch (error) {
    console.error("Redis connection test failed:", error);
    return false;
  }
}

// Pub/Sub helpers
export async function publish(channel: string, message: string): Promise<void> {
  const pub = getRedisPub();
  await pub.publish(channel, message);
}

export async function subscribe(
  channel: string,
  callback: (message: string) => void
): Promise<void> {
  const sub = getRedisSub();
  await sub.subscribe(channel);
  sub.on("message", (ch: string, message: string) => {
    if (ch === channel) {
      callback(message);
    }
  });
}

export async function unsubscribe(channel: string): Promise<void> {
  const sub = getRedisSub();
  await sub.unsubscribe(channel);
}
