import express from 'express';

import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';

export const app = express();

app.use(express.json());

app.get('/api/v1/health', (_request, response) => {
  response.status(200).json({
    data: {
      status: 'ok',
    },
  });
});

app.get('/api/v1/test-error', () => {
  throw new Error('Test error');
});

app.use(notFoundHandler);
app.use(errorHandler);
