import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext } from '../context/auth-context-value';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders authenticated content without a page-level logout control', () => {
    render(
      <AuthContext.Provider
        value={{
          user: {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'USER',
            createdAt: '2026-07-28T00:00:00.000Z',
          },
          isAuthenticated: true,
          isLoading: false,
          error: null,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
          refreshUser: vi.fn(),
        }}
      >
        <HomePage />
      </AuthContext.Provider>,
    );

    expect(
      screen.getByRole('heading', { name: 'Welcome, Test User' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Log out' })).not
      .toBeInTheDocument();
  });
});
