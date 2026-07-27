import express from 'express';

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

app.use(notFoundHandler);
