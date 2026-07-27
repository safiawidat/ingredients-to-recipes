import { Router } from 'express';

import { prisma } from '../../database/prisma.js';

export const healthRouter = Router();

healthRouter.get('/', (_request, response) => {
  response.status(200).json({
    data: {
      status: 'ok',
    },
  });
});

healthRouter.get('/database', async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    response.status(200).json({
      data: {
        status: 'ok',
        database: 'connected',
      },
    });
  } catch {
    response.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database connection unavailable',
      },
    });
  }
});
