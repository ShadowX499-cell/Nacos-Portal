import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { redis } from './config/redis';

const PORT = env.PORT;

async function main() {
  // Verify DB connection
  await prisma.$connect();
  console.log('✅ PostgreSQL connected');

  // Verify Redis connection
  await redis.ping();
  console.log('✅ Redis connected');

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
  });
}

main().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
});
