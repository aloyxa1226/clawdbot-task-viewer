import { createApp } from './app.js';
import { config } from './config.js';
import { initDatabase } from './db/connection.js';
import { initRedis } from './services/redis.js';
import { initPubSub } from './services/pubsub.js';
import { startCleanupJob } from './jobs/cleanup.js';

async function main() {
  console.log('🚀 Starting ClawdBot Task Viewer...');

  // Initialize database
  await initDatabase();
  console.log('✅ Database connected');

  // Initialize Redis
  await initRedis();
  console.log('✅ Redis connected');

  // Initialize pub/sub
  await initPubSub();
  console.log('✅ Pub/sub initialized');

  // Create Express app
  const app = createApp();

  // Start cleanup job
  startCleanupJob();
  console.log('✅ Cleanup job scheduled');

  // Start server
  app.listen(config.port, () => {
    console.log(`✅ Server running on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
