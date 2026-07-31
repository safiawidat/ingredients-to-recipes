import type { RequestHandler } from 'express';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { ApplicationError } from '../errors/application-error.js';
import { verifyAccessToken } from '../utils/token.js';

const authenticatedClaimsSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(UserRole),
});

export const authenticate: RequestHandler = (request, _response, next) => {
  const token = request.cookies?.[env.AUTH_COOKIE_NAME] as unknown;

  if (typeof token !== 'string' || token.length === 0) {
    throw new ApplicationError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication required',
    );
  }

  try {
    const claims = authenticatedClaimsSchema.parse(verifyAccessToken(token));

    request.user = {
      id: claims.sub,
      role: claims.role,
    };
  } catch {
    throw new ApplicationError(
      401,
      'INVALID_AUTH_TOKEN',
      'Invalid or expired authentication token',
    );
  }

  next();
};
