import type { CookieOptions, RequestHandler } from 'express';

import { env } from '../../config/env.js';
import { ApplicationError } from '../errors/application-error.js';
import {
  getCurrentUser as findCurrentUser,
  loginUser,
  registerUser,
} from '../services/auth-service.js';
import {
  loginSchema,
  registerSchema,
} from '../validation/auth-schemas.js';

const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.AUTH_COOKIE_SECURE,
  sameSite: env.AUTH_COOKIE_SAME_SITE,
  maxAge: env.AUTH_COOKIE_MAX_AGE_MS,
  path: '/',
};

const authCookieClearOptions: CookieOptions = {
  httpOnly: authCookieOptions.httpOnly,
  secure: authCookieOptions.secure,
  sameSite: authCookieOptions.sameSite,
  path: authCookieOptions.path,
};

export const register: RequestHandler = async (request, response) => {
  const input = registerSchema.parse(request.body);
  const user = await registerUser(input);

  response.status(201).json({
    data: {
      user,
    },
  });
};

export const login: RequestHandler = async (request, response) => {
  const input = loginSchema.parse(request.body);
  const { user, accessToken } = await loginUser(input);

  response.cookie(env.AUTH_COOKIE_NAME, accessToken, authCookieOptions);
  response.status(200).json({
    data: {
      user,
    },
  });
};

export const logout: RequestHandler = (_request, response) => {
  response.clearCookie(env.AUTH_COOKIE_NAME, authCookieClearOptions);
  response.status(204).send();
};

export const getCurrentUser: RequestHandler = async (request, response) => {
  if (!request.user) {
    throw new ApplicationError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication required',
    );
  }

  const user = await findCurrentUser(request.user.id);

  response.status(200).json({
    data: {
      user,
    },
  });
};
