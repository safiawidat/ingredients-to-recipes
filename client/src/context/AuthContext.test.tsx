import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import type { AuthContextValue } from './auth-context-value';

const {
  getCurrentUserMock,
  loginMock,
  logoutMock,
  registerMock,
} = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  loginMock: vi.fn(),
  logoutMock: vi.fn(),
  registerMock: vi.fn(),
}));

vi.mock('../services/auth-api', () => ({
  getCurrentUser: getCurrentUserMock,
  login: loginMock,
  logout: logoutMock,
  register: registerMock,
}));

import { AuthProvider } from './AuthContext';

const user = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'USER' as const,
  createdAt: '2026-07-28T00:00:00.000Z',
};

const ContextProbe = ({
  onValue,
}: {
  onValue?: (value: AuthContextValue) => void;
}) => {
  const contextValue = useAuth();

  useEffect(() => {
    onValue?.(contextValue);
  }, [contextValue, onValue]);

  return (
    <div>
      <span>{contextValue.isLoading ? 'loading' : 'ready'}</span>
      <span>{contextValue.user?.name ?? 'logged-out'}</span>
      <span>{contextValue.error ?? 'no-error'}</span>
    </div>
  );
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('AuthProvider', () => {
  it('shows initial loading and then loads the current user', async () => {
    let resolveUser!: (value: typeof user) => void;
    getCurrentUserMock.mockReturnValue(
      new Promise((resolve) => {
        resolveUser = resolve;
      }),
    );

    render(
      <AuthProvider>
        <ContextProbe />
      </AuthProvider>,
    );

    expect(screen.getByText('loading')).toBeInTheDocument();

    await act(async () => resolveUser(user));

    expect(await screen.findByText('ready')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('treats an unauthenticated initial request as logged out', async () => {
    getCurrentUserMock.mockRejectedValue(
      new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required'),
    );

    render(
      <AuthProvider>
        <ContextProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('logged-out')).toBeInTheDocument();
    expect(screen.getByText('no-error')).toBeInTheDocument();
  });

  it('updates state after a successful login', async () => {
    let contextValue: AuthContextValue | undefined;
    getCurrentUserMock.mockRejectedValue(
      new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required'),
    );
    loginMock.mockResolvedValue(user);

    render(
      <AuthProvider>
        <ContextProbe onValue={(value) => {
          contextValue = value;
        }} />
      </AuthProvider>,
    );
    await screen.findByText('ready');

    if (!contextValue) {
      throw new Error('Authentication context was not captured');
    }
    const capturedContext = contextValue;

    await act(async () => {
      await capturedContext.login({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('clears state after logout', async () => {
    let contextValue: AuthContextValue | undefined;
    getCurrentUserMock.mockResolvedValue(user);
    logoutMock.mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <ContextProbe onValue={(value) => {
          contextValue = value;
        }} />
      </AuthProvider>,
    );
    await screen.findByText('Test User');

    if (!contextValue) {
      throw new Error('Authentication context was not captured');
    }
    const capturedContext = contextValue;

    await act(async () => {
      await capturedContext.logout();
    });

    await waitFor(() =>
      expect(screen.getByText('logged-out')).toBeInTheDocument(),
    );
  });
});
