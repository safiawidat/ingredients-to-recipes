import type { RequestHandler } from 'express';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { ApplicationError } from '../errors/application-error.js';
import { findAuthenticationUser } from '../services/authentication-service.js';
import { verifyAccessToken } from '../utils/token.js';

const authenticatedClaimsSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(UserRole),
});

const invalidAuthTokenError = (): ApplicationError =>
  new ApplicationError(
    401,
    'INVALID_AUTH_TOKEN',
    'Invalid or expired authentication token',
  );

export const authenticate: RequestHandler = async (
  request,
  _response,
  next,
) => {
  const token = request.cookies?.[env.AUTH_COOKIE_NAME] as unknown;

  if (typeof token !== 'string' || token.length === 0) {
    throw new ApplicationError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication required',
    );
  }

  let claims: z.infer<typeof authenticatedClaimsSchema>;

  try {
    claims = authenticatedClaimsSchema.parse(verifyAccessToken(token));
  } catch {
    throw invalidAuthTokenError();
  }

  const currentUser = await findAuthenticationUser(claims.sub);

  if (!currentUser) {
    throw invalidAuthTokenError();
  }

  request.user = currentUser;

  next();
};
