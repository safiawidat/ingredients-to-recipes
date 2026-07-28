import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationError } from '../errors/application-error.js';

const { loginUserMock, registerUserMock } = vi.hoisted(() => ({
  loginUserMock: vi.fn(),
  registerUserMock: vi.fn(),
}));

vi.mock('../services/auth-service.js', () => ({
  loginUser: loginUserMock,
  registerUser: registerUserMock,
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
});

describe('authentication routes', () => {
  it('registers a user and returns HTTP 201', async () => {
    registerUserMock.mockResolvedValue(safeUser);

    const response = await request(app).post('/api/v1/auth/register').send({
      name: '  Test User  ',
      email: '  TEST@example.com ',
      password: 'password123',
    });

    expect(response.status).toBe(201);
    expect(registerUserMock).toHaveBeenCalledWith({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });
    expect(response.body).toEqual({
      data: {
        user: {
          ...safeUser,
          createdAt: createdAt.toISOString(),
        },
      },
    });
  });

  it('maps invalid registration input to a validation error', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      name: 'A',
      email: 'invalid-email',
      password: 'short',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    expect(registerUserMock).not.toHaveBeenCalled();
  });

  it('logs in without exposing the access token in JSON', async () => {
    loginUserMock.mockResolvedValue({
      user: safeUser,
      accessToken: 'signed-access-token',
    });

    const response = await request(app).post('/api/v1/auth/login').send({
      email: ' TEST@example.com ',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(loginUserMock).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(response.body).toEqual({
      data: {
        user: {
          ...safeUser,
          createdAt: createdAt.toISOString(),
        },
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('signed-access-token');
  });

  it('sets the login cookie as HTTP-only', async () => {
    loginUserMock.mockResolvedValue({
      user: safeUser,
      accessToken: 'signed-access-token',
    });

    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });
    const cookie = response.headers['set-cookie'];

    expect(cookie).toBeDefined();
    expect(cookie?.[0]).toContain('auth_token=signed-access-token');
    expect(cookie?.[0]).toContain('HttpOnly');
    expect(cookie?.[0]).toContain('Path=/');
    expect(cookie?.[0]).toContain('SameSite=Lax');
  });

  it('clears the authentication cookie on logout', async () => {
    const response = await request(app).post('/api/v1/auth/logout');
    const cookie = response.headers['set-cookie'];

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(cookie?.[0]).toContain('auth_token=');
    expect(cookie?.[0]).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    expect(cookie?.[0]).toContain('HttpOnly');
  });

  it('maps application errors to their public response', async () => {
    registerUserMock.mockRejectedValue(
      new ApplicationError(
        409,
        'EMAIL_ALREADY_EXISTS',
        'An account with this email already exists',
      ),
    );

    const response = await request(app).post('/api/v1/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email already exists',
      },
    });
  });
});
