import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import {
  AuthContext,
  type AuthContextValue,
} from '../context/auth-context-value';
import { HomePage } from './HomePage';

const authenticatedUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'USER' as const,
  createdAt: '2026-07-28T00:00:00.000Z',
};

const renderHomePage = (logout: AuthContextValue['logout']) =>
  render(
    <AuthContext.Provider
      value={{
        user: authenticatedUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        register: vi.fn(),
        logout,
        refreshUser: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<p>Login destination</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('HomePage logout', () => {
  it('navigates to login after successful logout', async () => {
    const user = userEvent.setup();
    const logout = vi.fn().mockResolvedValue(undefined);
    renderHomePage(logout);

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByText('Login destination')).toBeInTheDocument();
    expect(logout).toHaveBeenCalledOnce();
  });

  it('shows a safe error and stays on the page when logout fails', async () => {
    const user = userEvent.setup();
    const logout = vi.fn().mockRejectedValue(new Error('private failure'));
    renderHomePage(logout);

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to log out. Please try again.',
    );
    expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
    expect(screen.queryByText('Login destination')).not.toBeInTheDocument();
    expect(JSON.stringify(document.body.textContent)).not.toContain(
      'private failure',
    );
  });
});
