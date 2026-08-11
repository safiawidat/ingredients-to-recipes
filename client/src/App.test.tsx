import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createRecipeMock,
  getFavoritesMock,
  getRecipeMock,
  listAdminRecipesMock,
  listRecipesMock,
  recommendRecipesMock,
  updateRecipeMock,
  unfavoriteRecipeMock,
} = vi.hoisted(() => ({
  createRecipeMock: vi.fn(),
  getFavoritesMock: vi.fn(),
  getRecipeMock: vi.fn(),
  listAdminRecipesMock: vi.fn(),
  listRecipesMock: vi.fn(),
  recommendRecipesMock: vi.fn(),
  updateRecipeMock: vi.fn(),
  unfavoriteRecipeMock: vi.fn(),
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

vi.mock('./services/recommendation-api', () => ({
  recommendRecipes: recommendRecipesMock,
}));

vi.mock('./services/favorite-api', () => ({
  favoriteRecipe: vi.fn(),
  getFavorites: getFavoritesMock,
  unfavoriteRecipe: unfavoriteRecipeMock,
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
  getFavoritesMock.mockResolvedValue({ data: { recipes: [] } });
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

const renderUnauthenticatedApp = (path: string) =>
  render(
    <AuthContext.Provider
      value={{
        user: null,
        isAuthenticated: false,
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

  it('lets an authenticated user reach recommendations', () => {
    renderAuthenticatedApp('/recommendations');

    expect(
      screen.getByRole('heading', { name: 'Recipe recommendations' }),
    ).toBeInTheDocument();
  });

  it('lets an authenticated admin reach recommendations', () => {
    renderAuthenticatedApp('/recommendations', {
      ...regularUser,
      role: 'ADMIN',
    });

    expect(
      screen.getByRole('heading', { name: 'Recipe recommendations' }),
    ).toBeInTheDocument();
  });

  it('protects recommendations from unauthenticated visitors', () => {
    renderUnauthenticatedApp('/recommendations');

    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Recipe recommendations' }))
      .not.toBeInTheDocument();
  });

  it('lets an authenticated user reach favorites', async () => {
    renderAuthenticatedApp('/favorites');

    expect(
      await screen.findByRole('heading', { name: 'Favorites' }),
    ).toBeInTheDocument();
  });

  it('lets an authenticated admin reach favorites', async () => {
    renderAuthenticatedApp('/favorites', { ...regularUser, role: 'ADMIN' });

    expect(
      await screen.findByRole('heading', { name: 'Favorites' }),
    ).toBeInTheDocument();
  });

  it('protects favorites from unauthenticated visitors', () => {
    renderUnauthenticatedApp('/favorites');

    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Favorites' })).not
      .toBeInTheDocument();
  });
});
