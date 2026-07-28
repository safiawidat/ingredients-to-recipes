import type { UserRole } from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../database/prisma.js';
import { ApplicationError } from '../errors/application-error.js';
import {
  comparePassword,
  hashPassword,
} from '../utils/password.js';
import { generateAccessToken } from '../utils/token.js';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SafeAuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface LoginResult {
  user: SafeAuthenticatedUser;
  accessToken: string;
}

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

const duplicateEmailError = (): ApplicationError =>
  new ApplicationError(
    409,
    'EMAIL_ALREADY_EXISTS',
    'An account with this email already exists',
  );

const isUserEmailConflict = (error: unknown): boolean => {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002' ||
    error.meta?.modelName !== 'User'
  ) {
    return false;
  }

  const target = error.meta.target;
  const fields = Array.isArray(target) ? target : [target];

  return fields.some(
    (field) =>
      typeof field === 'string' &&
      (field === 'email' || field.includes('email')),
  );
};

export const registerUser = async (
  input: RegisterInput,
): Promise<SafeAuthenticatedUser> => {
  const email = normalizeEmail(input.email);
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw duplicateEmailError();
  }

  const passwordHash = await hashPassword(input.password);

  try {
    return await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
      },
      select: safeUserSelect,
    });
  } catch (error) {
    if (isUserEmailConflict(error)) {
      throw duplicateEmailError();
    }

    throw error;
  }
};

export const loginUser = async (
  input: LoginInput,
): Promise<LoginResult> => {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !(await comparePassword(input.password, user.passwordHash))) {
    throw new ApplicationError(
      401,
      'INVALID_CREDENTIALS',
      'Invalid email or password',
    );
  }

  const safeUser: SafeAuthenticatedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };

  return {
    user: safeUser,
    accessToken: generateAccessToken({
      sub: user.id,
      role: user.role,
    }),
  };
};

export const getCurrentUser = async (
  userId: string,
): Promise<SafeAuthenticatedUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: safeUserSelect,
  });

  if (!user) {
    throw new ApplicationError(
      401,
      'INVALID_AUTH_TOKEN',
      'Invalid or expired authentication token',
    );
  }

  return user;
};
