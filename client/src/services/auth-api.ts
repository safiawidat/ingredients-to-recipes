import { apiRequest } from '../lib/api';
import type {
  AuthenticatedUser,
  LoginInput,
  RegisterInput,
  UserResponse,
} from '../types/auth';

export const register = async (
  input: RegisterInput,
): Promise<AuthenticatedUser> => {
  const response = await apiRequest<UserResponse>('/auth/register', {
    method: 'POST',
    body: input,
  });

  return response.data.user;
};

export const login = async (
  input: LoginInput,
): Promise<AuthenticatedUser> => {
  const response = await apiRequest<UserResponse>('/auth/login', {
    method: 'POST',
    body: input,
    skipAuthExpiry: true,
  });

  return response.data.user;
};

export const logout = (): Promise<void> =>
  apiRequest<void>('/auth/logout', { method: 'POST' });

export const getCurrentUser = async (): Promise<AuthenticatedUser> => {
  const response = await apiRequest<UserResponse>('/auth/me');

  return response.data.user;
};
