import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { AUTH_EXPIRED_EVENT, ApiError } from '../lib/api';
import * as authApi from '../services/auth-api';
import type {
  AuthenticatedUser,
  LoginInput,
  RegisterInput,
} from '../types/auth';
import {
  AuthContext,
  type AuthContextValue,
} from './auth-context-value';

const getSafeErrorMessage = (error: unknown): string =>
  error instanceof ApiError
    ? error.message
    : 'The authentication request could not be completed';

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthenticationExpired = () => {
      setUser(null);
      setError(null);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthenticationExpired);

    return () => {
      window.removeEventListener(
        AUTH_EXPIRED_EVENT,
        handleAuthenticationExpired,
      );
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    void authApi
      .getCurrentUser()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser);
        }
      })
      .catch((requestError: unknown) => {
        if (!isMounted) {
          return;
        }

        setUser(null);
        if (!(requestError instanceof ApiError && requestError.status === 401)) {
          setError(getSafeErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    setError(null);
    try {
      const authenticatedUser = await authApi.login(input);
      setUser(authenticatedUser);
      return authenticatedUser;
    } catch (requestError) {
      setError(getSafeErrorMessage(requestError));
      throw requestError;
    }
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    setError(null);
    try {
      return await authApi.register(input);
    } catch (requestError) {
      setError(getSafeErrorMessage(requestError));
      throw requestError;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await authApi.logout();
      setUser(null);
    } catch (requestError) {
      setError(getSafeErrorMessage(requestError));
      throw requestError;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    setError(null);
    try {
      setUser(await authApi.getCurrentUser());
    } catch (requestError) {
      setUser(null);
      if (!(requestError instanceof ApiError && requestError.status === 401)) {
        setError(getSafeErrorMessage(requestError));
      }
      throw requestError;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      error,
      login,
      register,
      logout,
      refreshUser,
    }),
    [error, isLoading, login, logout, refreshUser, register, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
