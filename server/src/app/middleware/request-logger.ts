import type { RequestHandler } from 'express';

export const requestLogger: RequestHandler = (
  request,
  response,
  next,
) => {
  const startedAt = Date.now();

  response.on('finish', () => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const durationMs = Date.now() - startedAt;

    console.info(
      `${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms`,
    );
  });

  next();
};
