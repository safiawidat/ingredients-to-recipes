import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findUniqueUserMock } = vi.hoisted(() => ({
  findUniqueUserMock: vi.fn(),
}));

vi.mock('../../database/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: findUniqueUserMock,
    },
  },
}));

import { findAuthenticationUser } from './authentication-service.js';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('findAuthenticationUser', () => {
  it('loads only the current role-bearing authentication identity', async () => {
    const user = { id: 'user-1', role: 'ADMIN' };
    findUniqueUserMock.mockResolvedValue(user);

    await expect(findAuthenticationUser('user-1')).resolves.toEqual(user);
    expect(findUniqueUserMock).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true, role: true },
    });
  });

  it('returns null when the account no longer exists', async () => {
    findUniqueUserMock.mockResolvedValue(null);

    await expect(findAuthenticationUser('deleted-user')).resolves.toBeNull();
  });
});
