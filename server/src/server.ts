import { app } from './app/app.js';
import { env } from './config/env.js';
import { prisma } from './database/prisma.js';

const server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

let isShuttingDown = false;

const shutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.info(`${signal} received. Shutting down gracefully.`);

  server.close(async (error) => {
    if (error) {
      console.error('Failed to close HTTP server:', error);
      process.exitCode = 1;
    }

    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('Failed to disconnect from database:', disconnectError);
      process.exitCode = 1;
    }

    process.exit();
  });
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
