import { render, screen } from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import {
  AuthContext,
  type AuthContextValue,
} from '../context/auth-context-value';
import type { AuthenticatedUser } from '../types/auth';
import { AdminRoute } from './AdminRoute';

const user: AuthenticatedUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'USER',
  createdAt: '2026-07-28T00:00:00.000Z',
};

const createContextValue = (
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  ...overrides,
});

const LoginDestination = () => {
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from;

  return <p>Login destination from {from?.pathname ?? 'unknown'}</p>;
};

const renderAdminRoute = (value: AuthContextValue) =>
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/login" element={<LoginDestination />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<p>Admin content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('AdminRoute', () => {
  it('shows an accessible loading state', () => {
    renderAdminRoute(createContextValue({ isLoading: true }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading authentication',
    );
  });

  it('redirects an unauthenticated visitor to login', () => {
    renderAdminRoute(createContextValue());

    expect(
      screen.getByText('Login destination from /admin'),
    ).toBeInTheDocument();
  });

  it('shows access denied to an authenticated regular user', () => {
    renderAdminRoute(
      createContextValue({ user, isAuthenticated: true }),
    );

    expect(
      screen.getByRole('heading', { name: 'Access denied' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('renders the nested route for an admin', () => {
    renderAdminRoute(
      createContextValue({
        user: { ...user, role: 'ADMIN' },
        isAuthenticated: true,
      }),
    );

    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });
});
