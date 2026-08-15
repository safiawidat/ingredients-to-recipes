import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
import { ApiError } from '../lib/api';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

const authenticatedUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'USER' as const,
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

const Destination = () => {
  const location = useLocation();
  const message = (location.state as { message?: string } | null)?.message;

  return (
    <>
      <p>Destination reached</p>
      {message && <p>{message}</p>}
    </>
  );
};

describe('LoginPage', () => {
  it('navigates to the originally requested route after login', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue(authenticatedUser);

    render(
      <AuthContext.Provider value={createContextValue({ login })}>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/login',
              state: { from: { pathname: '/private' } },
            },
          ]}
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/private" element={<Destination />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Destination reached')).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('displays a safe authentication error', async () => {
    const user = userEvent.setup();
    const login = vi
      .fn()
      .mockRejectedValue(
        new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),
      );

    render(
      <AuthContext.Provider value={createContextValue({ login })}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid email or password',
    );
  });
});

describe('RegisterPage', () => {
  it('rejects mismatched passwords without calling the API', async () => {
    const user = userEvent.setup();
    const register = vi.fn();

    render(
      <AuthContext.Provider value={createContextValue({ register })}>
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    await user.type(screen.getByLabelText('Name'), 'Test User');
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(
      screen.getByLabelText('Confirm password'),
      'different123',
    );
    await user.click(
      screen.getByRole('button', { name: 'Create account' }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Passwords do not match',
    );
    expect(register).not.toHaveBeenCalled();
  });

  it('redirects to login after successful registration', async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue(authenticatedUser);

    render(
      <AuthContext.Provider value={createContextValue({ register })}>
        <MemoryRouter initialEntries={['/register']}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<Destination />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    await user.type(screen.getByLabelText('Name'), 'Test User');
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(
      screen.getByLabelText('Confirm password'),
      'password123',
    );
    await user.click(
      screen.getByRole('button', { name: 'Create account' }),
    );

    expect(await screen.findByText('Destination reached')).toBeInTheDocument();
    expect(
      screen.getByText('Registration successful. You can now log in.'),
    ).toBeInTheDocument();
    expect(register).toHaveBeenCalledWith({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });
  });
});
