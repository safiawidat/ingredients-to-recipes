import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from './app.js';

describe('GET /api/v1/health', () => {
  it('returns the server health status', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        status: 'ok',
      },
    });
  });
});

describe('unknown routes', () => {
  it('returns the shared 404 error format', async () => {
    const response = await request(app).get('/api/v1/unknown');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });
});
