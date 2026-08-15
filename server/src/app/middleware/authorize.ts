import type { RequestHandler } from 'express';

import type { UserRole } from '../../generated/prisma/enums.js';
import { ApplicationError } from '../errors/application-error.js';

export const authorize =
  (...allowedRoles: UserRole[]): RequestHandler =>
  (request, _response, next) => {
    if (!request.user) {
      throw new ApplicationError(
        401,
        'AUTHENTICATION_REQUIRED',
        'Authentication required',
      );
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new ApplicationError(
        403,
        'FORBIDDEN',
        'You do not have permission to access this resource',
      );
    }

    next();
  };
