import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import {
  AuthContext,
  type AuthContextValue,
} from '../context/auth-context-value';
import type { AuthenticatedUser } from '../types/auth';
import { AppShell } from './AppShell';

const authenticatedUser: AuthenticatedUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'USER',
  createdAt: '2026-07-28T00:00:00.000Z',
};

const renderAppShell = (
  user: AuthenticatedUser,
  logout: AuthContextValue['logout'] = vi.fn(),
  initialPath = '/',
) =>
  render(
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        register: vi.fn(),
        logout,
        refreshUser: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<p>Page content</p>} />
            <Route
              path="/recommendations"
              element={<p>Recommendations page content</p>}
            />
            <Route path="/favorites" element={<p>Favorites page content</p>} />
          </Route>
          <Route path="/login" element={<p>Login destination</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('AppShell', () => {
  it('shows common navigation and current user information', () => {
    renderAppShell(authenticatedUser);

    expect(screen.getByRole('navigation', { name: 'Primary navigation' }))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Recipes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Recommendations' }))
      .toHaveAttribute('href', '/recommendations');
    expect(screen.getByRole('link', { name: 'Favorites' })).toHaveAttribute(
      'href',
      '/favorites',
    );
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('USER')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('hides admin navigation from a regular user', () => {
    renderAppShell(authenticatedUser);

    expect(screen.queryByRole('link', { name: 'Admin' })).not
      .toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin Recipes' })).not
      .toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ingredient Aliases' })).not
      .toBeInTheDocument();
  });

  it('shows admin navigation to an admin', () => {
    renderAppShell({ ...authenticatedUser, role: 'ADMIN' });

    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Admin Recipes' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ingredient Aliases' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Recommendations' }))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Favorites' })).toBeInTheDocument();
  });

  it('marks recommendations active on its route', () => {
    renderAppShell(authenticatedUser, vi.fn(), '/recommendations');

    expect(screen.getByRole('link', { name: 'Recommendations' }))
      .toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Recommendations page content'))
      .toBeInTheDocument();
  });

  it('marks favorites active on its route', () => {
    renderAppShell(authenticatedUser, vi.fn(), '/favorites');

    expect(screen.getByRole('link', { name: 'Favorites' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Favorites page content')).toBeInTheDocument();
  });

  it('logs out and navigates to login', async () => {
    const user = userEvent.setup();
    const logout = vi.fn().mockResolvedValue(undefined);
    renderAppShell(authenticatedUser, logout);

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByText('Login destination')).toBeInTheDocument();
    expect(logout).toHaveBeenCalledOnce();
  });

  it('shows a safe error when logout fails', async () => {
    const user = userEvent.setup();
    const logout = vi.fn().mockRejectedValue(new Error('private failure'));
    renderAppShell(authenticatedUser, logout);

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to log out. Please try again.',
    );
    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(JSON.stringify(document.body.textContent)).not.toContain(
      'private failure',
    );
  });
});
