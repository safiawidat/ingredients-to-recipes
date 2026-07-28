import cookieParser from 'cookie-parser';
import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRole } from '../../generated/prisma/enums.js';
import { errorHandler } from './error-handler.js';

const { verifyAccessTokenMock } = vi.hoisted(() => ({
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../utils/token.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

import { authenticate } from './authenticate.js';
import { authorize } from './authorize.js';

const createTestApp = (...handlers: RequestHandler[]) => {
  const app = express();

  app.use(cookieParser());
  app.get('/test', ...handlers, (request, response) => {
    response.status(200).json({ user: request.user });
  });
  app.use(errorHandler);

  return app;
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('authenticate', () => {
  const app = createTestApp(authenticate);

  it('rejects a missing authentication cookie', async () => {
    const response = await request(app).get('/test');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      },
    });
  });

  it('attaches only the user id and role for a valid token', async () => {
    verifyAccessTokenMock.mockReturnValue({
      sub: 'user-1',
      role: UserRole.USER,
      email: 'must-not-be-attached@example.com',
      iat: 123,
      exp: 456,
    });

    const response = await request(app)
      .get('/test')
      .set('Cookie', 'auth_token=valid-token');

    expect(response.status).toBe(200);
    expect(verifyAccessTokenMock).toHaveBeenCalledWith('valid-token');
    expect(response.body).toEqual({
      user: {
        id: 'user-1',
        role: UserRole.USER,
      },
    });
  });

  it('maps an invalid token to a safe authentication error', async () => {
    verifyAccessTokenMock.mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    const response = await request(app)
      .get('/test')
      .set('Cookie', 'auth_token=invalid-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_AUTH_TOKEN',
        message: 'Invalid or expired authentication token',
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('jwt malformed');
  });

  it('maps an expired token to the same safe authentication error', async () => {
    verifyAccessTokenMock.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    const response = await request(app)
      .get('/test')
      .set('Cookie', 'auth_token=expired-token');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_AUTH_TOKEN');
    expect(JSON.stringify(response.body)).not.toContain('jwt expired');
  });

  it('rejects malformed token claims', async () => {
    verifyAccessTokenMock.mockReturnValue({
      sub: '',
      role: 'OWNER',
    });

    const response = await request(app)
      .get('/test')
      .set('Cookie', 'auth_token=malformed-claims');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_AUTH_TOKEN');
  });
});

describe('authorize', () => {
  it('allows an authenticated user with an allowed role', async () => {
    const attachUser: RequestHandler = (request, _response, next) => {
      request.user = {
        id: 'user-1',
        role: UserRole.ADMIN,
      };
      next();
    };
    const app = createTestApp(
      attachUser,
      authorize(UserRole.ADMIN),
    );

    const response = await request(app).get('/test');

    expect(response.status).toBe(200);
  });

  it('rejects an authenticated user without an allowed role', async () => {
    const attachUser: RequestHandler = (request, _response, next) => {
      request.user = {
        id: 'user-1',
        role: UserRole.USER,
      };
      next();
    };
    const app = createTestApp(
      attachUser,
      authorize(UserRole.ADMIN),
    );

    const response = await request(app).get('/test');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this resource',
      },
    });
  });

  it('rejects a request when authentication has not run', async () => {
    const app = createTestApp(authorize(UserRole.USER));

    const response = await request(app).get('/test');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });
});
