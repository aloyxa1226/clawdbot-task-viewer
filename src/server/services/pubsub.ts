import { createClient, RedisClientType } from 'redis';
import { config } from '../config.js';
import type { SSEEventType } from '@shared/types.js';

const CHANNEL = 'taskviewer:events';

let publisher: RedisClientType | null = null;
let subscriber: RedisClientType | null = null;

type EventHandler = (event: { type: SSEEventType; data: unknown }) => void;
const handlers: Set<EventHandler> = new Set();

export async function initPubSub(): Promise<void> {
  publisher = createClient({ url: config.redis.url });
  subscriber = createClient({ url: config.redis.url });

  await publisher.connect();
  await subscriber.connect();

  await subscriber.subscribe(CHANNEL, (message) => {
    try {
      const event = JSON.parse(message);
      handlers.forEach((handler) => handler(event));
    } catch (err) {
      console.error('Failed to parse pub/sub message:', err);
    }
  });
}

export async function publishEvent(type: SSEEventType, data: unknown): Promise<void> {
  if (!publisher) {
    console.warn('Publisher not initialized');
    return;
  }

  const event = { type, data, timestamp: new Date().toISOString() };
  await publisher.publish(CHANNEL, JSON.stringify(event));
}

export function subscribeToPubSub(handler: EventHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export async function closePubSub(): Promise<void> {
  if (publisher) {
    await publisher.quit();
    publisher = null;
  }
  if (subscriber) {
    await subscriber.quit();
    subscriber = null;
  }
}
