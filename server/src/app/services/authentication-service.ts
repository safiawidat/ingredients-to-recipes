import { prisma } from '../../database/prisma.js';
import type { UserRole } from '../../generated/prisma/enums.js';

export interface AuthenticationUser {
  id: string;
  role: UserRole;
}

export const findAuthenticationUser = (
  userId: string,
): Promise<AuthenticationUser | null> =>
  prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
