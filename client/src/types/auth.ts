export type UserRole = 'USER' | 'ADMIN';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UserResponse {
  data: {
    user: AuthenticatedUser;
  };
}
