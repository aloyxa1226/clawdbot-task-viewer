export const config = {
  port: parseInt(process.env.PORT || '3456', 10),
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/taskviewer',
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  files: {
    storagePath: process.env.FILE_STORAGE_PATH || '/data/files',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '1048576', 10), // 1MB
    maxTaskFileSize: parseInt(process.env.MAX_TASK_FILE_SIZE || '10485760', 10), // 10MB
  },
  
  cleanup: {
    retentionDays: parseInt(process.env.RETENTION_DAYS || '30', 10),
    cronSchedule: process.env.CLEANUP_CRON || '0 3 * * *', // 3 AM daily
  },
  
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};
