import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

import { env } from '../../config/env.js';
import {
  generateAccessToken,
  verifyAccessToken,
} from './token.js';

describe('access-token utilities', () => {
  it('generates a verifiable token with the expected claims', () => {
    const token = generateAccessToken({
      sub: 'user-1',
      role: 'USER',
    });

    expect(typeof token).toBe('string');
    expect(verifyAccessToken(token)).toMatchObject({
      sub: 'user-1',
      role: 'USER',
    });
  });

  it('rejects an invalid token', () => {
    expect(() => verifyAccessToken('not-a-valid-token')).toThrow();
  });

  it('rejects an expired token', () => {
    const expiredToken = jwt.sign(
      {
        sub: 'user-1',
        role: 'USER',
      },
      env.JWT_SECRET,
      { expiresIn: -1 },
    );

    expect(() => verifyAccessToken(expiredToken)).toThrow();
  });

  it('rejects a token signed with a different algorithm', () => {
    const token = jwt.sign(
      {
        sub: 'user-1',
        role: 'USER',
      },
      env.JWT_SECRET,
      { algorithm: 'HS512' },
    );

    expect(() => verifyAccessToken(token)).toThrow();
  });
});
