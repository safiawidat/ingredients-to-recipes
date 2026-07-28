import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '../../generated/prisma/client.js';

const {
  comparePasswordMock,
  createUserMock,
  findUniqueUserMock,
  generateAccessTokenMock,
  hashPasswordMock,
} = vi.hoisted(() => ({
  comparePasswordMock: vi.fn(),
  createUserMock: vi.fn(),
  findUniqueUserMock: vi.fn(),
  generateAccessTokenMock: vi.fn(),
  hashPasswordMock: vi.fn(),
}));

vi.mock('../../database/prisma.js', () => ({
  prisma: {
    user: {
      create: createUserMock,
      findUnique: findUniqueUserMock,
    },
  },
}));

vi.mock('../utils/password.js', () => ({
  comparePassword: comparePasswordMock,
  hashPassword: hashPasswordMock,
}));

vi.mock('../utils/token.js', () => ({
  generateAccessToken: generateAccessTokenMock,
}));

import {
  getCurrentUser,
  loginUser,
  registerUser,
} from './auth-service.js';

const createdAt = new Date('2026-07-28T00:00:00.000Z');
const safeUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'USER' as const,
  createdAt,
};
const storedUser = {
  ...safeUser,
  passwordHash: 'stored-password-hash',
  updatedAt: createdAt,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('registerUser', () => {
  it('normalizes input, hashes the password, and returns a safe user', async () => {
    findUniqueUserMock.mockResolvedValue(null);
    hashPasswordMock.mockResolvedValue('new-password-hash');
    createUserMock.mockResolvedValue(safeUser);

    const result = await registerUser({
      name: '  Test User  ',
      email: '  TEST@Example.COM ',
      password: 'plain-password',
    });

    expect(findUniqueUserMock).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      select: { id: true },
    });
    expect(hashPasswordMock).toHaveBeenCalledWith('plain-password');
    expect(createUserMock).toHaveBeenCalledWith({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'new-password-hash',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    expect(result).toEqual(safeUser);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects an existing normalized email', async () => {
    findUniqueUserMock.mockResolvedValue({ id: 'existing-user' });

    await expect(
      registerUser({
        name: 'Test User',
        email: ' TEST@example.com ',
        password: 'plain-password',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'An account with this email already exists',
    });

    expect(hashPasswordMock).not.toHaveBeenCalled();
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it('maps a concurrent email unique conflict to the duplicate error', async () => {
    findUniqueUserMock.mockResolvedValue(null);
    hashPasswordMock.mockResolvedValue('new-password-hash');
    createUserMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '7.9.0',
          meta: {
            modelName: 'User',
            target: ['email'],
          },
        },
      ),
    );

    await expect(
      registerUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'plain-password',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'An account with this email already exists',
    });
  });

  it('does not map an unrelated unique conflict to a duplicate email', async () => {
    const unrelatedConflict = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '7.9.0',
        meta: {
          modelName: 'User',
          target: ['unrelatedField'],
        },
      },
    );
    findUniqueUserMock.mockResolvedValue(null);
    hashPasswordMock.mockResolvedValue('new-password-hash');
    createUserMock.mockRejectedValue(unrelatedConflict);

    await expect(
      registerUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'plain-password',
      }),
    ).rejects.toBe(unrelatedConflict);
  });
});

describe('loginUser', () => {
  it('returns a safe user and access token for valid credentials', async () => {
    findUniqueUserMock.mockResolvedValue(storedUser);
    comparePasswordMock.mockResolvedValue(true);
    generateAccessTokenMock.mockReturnValue('access-token');

    const result = await loginUser({
      email: ' TEST@example.com ',
      password: 'plain-password',
    });

    expect(findUniqueUserMock).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
    expect(comparePasswordMock).toHaveBeenCalledWith(
      'plain-password',
      'stored-password-hash',
    );
    expect(generateAccessTokenMock).toHaveBeenCalledWith({
      sub: 'user-1',
      role: 'USER',
    });
    expect(result).toEqual({
      user: safeUser,
      accessToken: 'access-token',
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('returns the generic credentials error for an unknown email', async () => {
    findUniqueUserMock.mockResolvedValue(null);

    await expect(
      loginUser({
        email: 'unknown@example.com',
        password: 'plain-password',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });

    expect(comparePasswordMock).not.toHaveBeenCalled();
    expect(generateAccessTokenMock).not.toHaveBeenCalled();
  });

  it('returns the same credentials error for an incorrect password', async () => {
    findUniqueUserMock.mockResolvedValue(storedUser);
    comparePasswordMock.mockResolvedValue(false);

    await expect(
      loginUser({
        email: 'test@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });

    expect(generateAccessTokenMock).not.toHaveBeenCalled();
  });
});

describe('getCurrentUser', () => {
  it('returns only the selected safe user fields', async () => {
    findUniqueUserMock.mockResolvedValue(safeUser);

    const result = await getCurrentUser('user-1');

    expect(findUniqueUserMock).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    expect(result).toEqual(safeUser);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects a deleted user as an invalid authentication token', async () => {
    findUniqueUserMock.mockResolvedValue(null);

    await expect(getCurrentUser('deleted-user')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_AUTH_TOKEN',
      message: 'Invalid or expired authentication token',
    });
  });
});
