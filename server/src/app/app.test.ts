import request from 'supertest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const { queryRawMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
}));

vi.mock('../database/prisma.js', () => ({
  prisma: {
    $queryRaw: queryRawMock,
  },
}));

import { app, createApp } from './app.js';

let clientDistPath: string;

beforeAll(async () => {
  clientDistPath = await mkdtemp(join(tmpdir(), 'ingredients-client-'));
  await mkdir(join(clientDistPath, 'assets'));
  await writeFile(
    join(clientDistPath, 'index.html'),
    '<!doctype html><html><body>React test shell</body></html>',
  );
  await writeFile(
    join(clientDistPath, 'assets', 'app.js'),
    'globalThis.__STATIC_TEST__ = true;',
  );
});

afterAll(async () => {
  await rm(clientDistPath, { recursive: true, force: true });
});

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

describe('production client hosting', () => {
  const productionApp = () =>
    createApp({ nodeEnv: 'production', clientDistPath });

  it('preserves API responses and API 404s', async () => {
    const healthResponse = await request(productionApp()).get(
      '/api/v1/health',
    );
    const notFoundResponse = await request(productionApp()).get(
      '/api/v1/unknown',
    );

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.type).toContain('json');
    expect(healthResponse.body).toEqual({ data: { status: 'ok' } });
    expect(notFoundResponse.status).toBe(404);
    expect(notFoundResponse.type).toContain('json');
    expect(notFoundResponse.body.error?.code).toBe('NOT_FOUND');
  });

  it.each(['/', '/recipes/recipe-1', '/admin/recipes/import'])(
    'serves the React shell for %s',
    async (path) => {
      const response = await request(productionApp()).get(path);

      expect(response.status).toBe(200);
      expect(response.type).toContain('html');
      expect(response.text).toContain('React test shell');
    },
  );

  it('serves a built static asset', async () => {
    const response = await request(productionApp()).get('/assets/app.js');

    expect(response.status).toBe(200);
    expect(response.type).toContain('javascript');
    expect(response.text).toContain('__STATIC_TEST__');
  });
});

describe('unexpected errors', () => {
  it('returns the shared 500 error format', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
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

describe('JSON request errors', () => {
  it('maps malformed JSON to a safe 400 response', async () => {
    const response = await request(app)
      .post('/api/v1/unknown')
      .set('Content-Type', 'application/json')
      .send('{"recipes":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must contain valid JSON',
      },
    });
  });

  it('maps JSON over the existing 1 MiB limit to a safe 413 response', async () => {
    const response = await request(app)
      .post('/api/v1/unknown')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ value: 'x'.repeat(1024 * 1024) }));

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body exceeds the 1 MiB limit',
      },
    });
  });
});

describe('application security', () => {
  it('adds security headers', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('allows the configured frontend origin', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:5173');

    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
