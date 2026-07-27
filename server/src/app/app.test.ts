import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryRawMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
}));

vi.mock('../database/prisma.js', () => ({
  prisma: {
    $queryRaw: queryRawMock,
  },
}));

import { app } from './app.js';

beforeEach(() => {
  queryRawMock.mockReset();
});

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

describe('GET /api/v1/health/database', () => {
  it('reports a connected database', async () => {
    queryRawMock.mockResolvedValue([{ '?column?': 1 }]);

    const response = await request(app).get('/api/v1/health/database');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        status: 'ok',
        database: 'connected',
      },
    });
  });

  it('reports an unavailable database without exposing details', async () => {
    queryRawMock.mockRejectedValue(new Error('private connection details'));

    const response = await request(app).get('/api/v1/health/database');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database connection unavailable',
      },
    });

    expect(JSON.stringify(response.body)).not.toContain(
      'private connection details',
    );
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

describe('unexpected errors', () => {
  it('returns the shared 500 error format', async () => {
    const response = await request(app).get('/api/v1/test-error');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });
});
