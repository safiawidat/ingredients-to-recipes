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
import { ProtectedRoute } from './ProtectedRoute';

const user = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'USER' as const,
  createdAt: '2026-07-28T00:00:00.000Z',
};

const createContextValue = (
  overrides: Partial<AuthContextValue>,
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

const renderProtectedRoute = (value: AuthContextValue) =>
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route path="/login" element={<LoginDestination />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/private" element={<p>Protected content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('ProtectedRoute', () => {
  it('shows a loading state', () => {
    renderProtectedRoute(createContextValue({ isLoading: true }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading authentication',
    );
  });

  it('redirects an unauthenticated visitor and preserves the route', () => {
    renderProtectedRoute(createContextValue({}));

    expect(
      screen.getByText('Login destination from /private'),
    ).toBeInTheDocument();
  });

  it('renders protected content for an authenticated user', () => {
    renderProtectedRoute(
      createContextValue({
        user,
        isAuthenticated: true,
      }),
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});
