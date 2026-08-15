import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationError } from '../errors/application-error.js';

const {
  findAuthenticationUserMock,
  getCurrentUserMock,
  verifyAccessTokenMock,
} = vi.hoisted(() => ({
  findAuthenticationUserMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../services/authentication-service.js', () => ({
  findAuthenticationUser: findAuthenticationUserMock,
}));

vi.mock('../services/auth-service.js', () => ({
  getCurrentUser: getCurrentUserMock,
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

vi.mock('../utils/token.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

import { app } from '../app.js';

const createdAt = new Date('2026-07-28T00:00:00.000Z');
const safeUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'USER',
  createdAt,
};

beforeEach(() => {
  vi.resetAllMocks();
  findAuthenticationUserMock.mockImplementation(async (id: string) => ({
    id,
    role: id.startsWith('admin') ? 'ADMIN' : 'USER',
  }));
});

describe('GET /api/v1/auth/me', () => {
  it('returns the current safe user for a valid cookie', async () => {
    verifyAccessTokenMock.mockReturnValue({
      sub: 'user-1',
      role: 'USER',
    });
    getCurrentUserMock.mockResolvedValue(safeUser);

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', 'auth_token=valid-token');

    expect(response.status).toBe(200);
    expect(getCurrentUserMock).toHaveBeenCalledWith('user-1');
    expect(response.body).toEqual({
      data: {
        user: {
          ...safeUser,
          createdAt: createdAt.toISOString(),
        },
      },
    });
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('rejects a request without an authentication cookie', async () => {
    const response = await request(app).get('/api/v1/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(getCurrentUserMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid token without exposing token details', async () => {
    verifyAccessTokenMock.mockImplementation(() => {
      throw new Error('private jwt failure');
    });

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', 'auth_token=invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_AUTH_TOKEN');
    expect(JSON.stringify(response.body)).not.toContain('private jwt failure');
    expect(getCurrentUserMock).not.toHaveBeenCalled();
  });

  it('rejects a token for a user that no longer exists', async () => {
    verifyAccessTokenMock.mockReturnValue({
      sub: 'deleted-user',
      role: 'USER',
    });
    getCurrentUserMock.mockRejectedValue(
      new ApplicationError(
        401,
        'INVALID_AUTH_TOKEN',
        'Invalid or expired authentication token',
      ),
    );

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', 'auth_token=valid-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_AUTH_TOKEN',
        message: 'Invalid or expired authentication token',
      },
    });
  });
});
