import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createUserMock, findUniqueUserMock } = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  findUniqueUserMock: vi.fn(),
}));

vi.mock('../../database/prisma.js', () => ({
  prisma: {
    user: {
      create: createUserMock,
      findUnique: findUniqueUserMock,
    },
  },
}));

import { app } from '../app.js';

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'USER';
  createdAt: Date;
  updatedAt: Date;
}

let storedUser: StoredUser | null;

beforeEach(() => {
  vi.resetAllMocks();
  storedUser = null;

  findUniqueUserMock.mockImplementation(
    (query: {
      where: { email?: string; id?: string };
      select?: Record<string, boolean>;
    }) => {
      if (!storedUser) {
        return null;
      }

      if (
        query.where.email !== storedUser.email &&
        query.where.id !== storedUser.id
      ) {
        return null;
      }

      if (query.select) {
        return {
          id: storedUser.id,
          name: storedUser.name,
          email: storedUser.email,
          role: storedUser.role,
          createdAt: storedUser.createdAt,
        };
      }

      return storedUser;
    },
  );

  createUserMock.mockImplementation(
    (query: {
      data: {
        name: string;
        email: string;
        passwordHash: string;
      };
    }) => {
      const timestamp = new Date('2026-07-28T00:00:00.000Z');

      storedUser = {
        id: 'user-1',
        ...query.data,
        role: 'USER',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      return {
        id: storedUser.id,
        name: storedUser.name,
        email: storedUser.email,
        role: storedUser.role,
        createdAt: storedUser.createdAt,
      };
    },
  );
});

describe('authentication flow', () => {
  it('registers, logs in, reads the current user, and logs out', async () => {
    const agent = request.agent(app);

    const registration = await agent.post('/api/v1/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });

    expect(registration.status).toBe(201);
    expect(registration.body.data.user).not.toHaveProperty('passwordHash');

    const login = await agent.post('/api/v1/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });
    const loginCookie = login.headers['set-cookie']?.[0];

    expect(login.status).toBe(200);
    expect(loginCookie).toContain('auth_token=');
    expect(loginCookie).toContain('HttpOnly');
    expect(login.body.data).not.toHaveProperty('accessToken');

    const currentUser = await agent.get('/api/v1/auth/me');

    expect(currentUser.status).toBe(200);
    expect(currentUser.body.data.user).toMatchObject({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'USER',
    });
    expect(currentUser.body.data.user).not.toHaveProperty('passwordHash');

    const logout = await agent.post('/api/v1/auth/logout');
    const logoutCookie = logout.headers['set-cookie']?.[0];

    expect(logout.status).toBe(204);
    expect(logoutCookie).toContain('auth_token=');
    expect(logoutCookie).toContain(
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    );
  });
});
