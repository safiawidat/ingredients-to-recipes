import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  apiRequest: apiRequestMock,
}));

import {
  getCurrentUser,
  login,
  logout,
  register,
} from './auth-api';

const user = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'USER' as const,
  createdAt: '2026-07-28T00:00:00.000Z',
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('authentication API service', () => {
  it('registers and returns the response user', async () => {
    apiRequestMock.mockResolvedValue({ data: { user } });
    const input = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    await expect(register(input)).resolves.toEqual(user);
    expect(apiRequestMock).toHaveBeenCalledWith('/auth/register', {
      method: 'POST',
      body: input,
    });
  });

  it('logs in and returns the response user', async () => {
    apiRequestMock.mockResolvedValue({ data: { user } });
    const input = {
      email: 'test@example.com',
      password: 'password123',
    };

    await expect(login(input)).resolves.toEqual(user);
    expect(apiRequestMock).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: input,
      skipAuthExpiry: true,
    });
  });

  it('loads the current user', async () => {
    apiRequestMock.mockResolvedValue({ data: { user } });

    await expect(getCurrentUser()).resolves.toEqual(user);
    expect(apiRequestMock).toHaveBeenCalledWith('/auth/me');
  });

  it('logs out through the shared API helper', async () => {
    apiRequestMock.mockResolvedValue(undefined);

    await expect(logout()).resolves.toBeUndefined();
    expect(apiRequestMock).toHaveBeenCalledWith('/auth/logout', {
      method: 'POST',
    });
  });
});
