import jwt, {
  type Algorithm,
  type JwtPayload,
  type SignOptions,
} from 'jsonwebtoken';

import { env } from '../../config/env.js';

export type AccessTokenPayload = JwtPayload;

const ACCESS_TOKEN_ALGORITHM: Algorithm = 'HS256';

const getJwtSecret = (): string => {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return env.JWT_SECRET;
};

export const generateAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, getJwtSecret(), {
    algorithm: ACCESS_TOKEN_ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN as NonNullable<SignOptions['expiresIn']>,
  });

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const payload = jwt.verify(token, getJwtSecret(), {
    algorithms: [ACCESS_TOKEN_ALGORITHM],
  });

  if (typeof payload === 'string') {
    throw new Error('Invalid access token payload');
  }

  return payload;
};
