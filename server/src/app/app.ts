import express from 'express';

import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { requestLogger } from './middleware/request-logger.js';
import { healthRouter } from './routes/health.js';

export const app = express();

app.use(requestLogger);
app.use(express.json());

app.use('/api/v1/health', healthRouter);

app.get('/api/v1/test-error', () => {
  throw new Error('Test error');
});

app.use(notFoundHandler);
app.use(errorHandler);
