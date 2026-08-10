import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createRecipeMock,
  getRecipeMock,
  listAdminRecipesMock,
  listRecipesMock,
  updateRecipeMock,
} = vi.hoisted(() => ({
  createRecipeMock: vi.fn(),
  getRecipeMock: vi.fn(),
  listAdminRecipesMock: vi.fn(),
  listRecipesMock: vi.fn(),
  updateRecipeMock: vi.fn(),
}));

vi.mock('./services/recipe-api', () => ({
  getRecipe: getRecipeMock,
  listRecipes: listRecipesMock,
}));

vi.mock('./services/admin-recipe-api', () => ({
  createRecipe: createRecipeMock,
  listAdminRecipes: listAdminRecipesMock,
  updateRecipe: updateRecipeMock,
}));

import App from './App';
import { AuthContext } from './context/auth-context-value';
import type { AuthenticatedUser } from './types/auth';

const regularUser: AuthenticatedUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'USER',
  createdAt: '2026-07-28T00:00:00.000Z',
};

beforeEach(() => {
  vi.resetAllMocks();
  listRecipesMock.mockResolvedValue({
    data: {
      recipes: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      },
    },
  });
  listAdminRecipesMock.mockResolvedValue({
    data: {
      recipes: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      },
    },
  });
});

const renderAuthenticatedApp = (path: string, user = regularUser) =>
  render(
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('App', () => {
  it('renders the catch-all not-found route', () => {
    render(
      <MemoryRouter initialEntries={['/missing']}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Page not found',
      }),
    ).toBeInTheDocument();
  });

  it('renders recipes inside the authenticated shell', () => {
    renderAuthenticatedApp('/recipes');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Recipes' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Primary navigation' }),
    ).toBeInTheDocument();
  });

  it('keeps the normal authenticated home route available to a user', () => {
    renderAuthenticatedApp('/');

    expect(
      screen.getByRole('heading', { name: 'Welcome, Test User' }),
    ).toBeInTheDocument();
  });

  it('renders an admin route for an admin', () => {
    renderAuthenticatedApp('/admin/recipes', {
      ...regularUser,
      role: 'ADMIN',
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Admin Recipes' }),
    ).toBeInTheDocument();
  });
});
