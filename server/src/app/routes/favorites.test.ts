import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationError } from '../errors/application-error.js';

const {
  favoriteRecipeMock,
  findAuthenticationUserMock,
  listFavoritesMock,
  unfavoriteRecipeMock,
  verifyAccessTokenMock,
} = vi.hoisted(() => ({
    favoriteRecipeMock: vi.fn(),
    findAuthenticationUserMock: vi.fn(),
  listFavoritesMock: vi.fn(),
  unfavoriteRecipeMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../services/authentication-service.js', () => ({
  findAuthenticationUser: findAuthenticationUserMock,
}));

vi.mock('../services/favorite-service.js', () => ({
  favoriteRecipe: favoriteRecipeMock,
  listFavorites: listFavoritesMock,
  unfavoriteRecipe: unfavoriteRecipeMock,
}));

vi.mock('../utils/token.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

import { app } from '../app.js';

const cookie = 'auth_token=test-token';
const recipe = {
  id: 'recipe-1',
  name: 'Tomato Soup',
  description: null,
  cuisine: null,
  preparationTime: null,
  servings: null,
  imageUrl: null,
  dietTags: [],
  allergens: [],
  isPublished: true,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
};

const authenticateAs = (role: 'USER' | 'ADMIN', id: string): void => {
  verifyAccessTokenMock.mockReturnValue({ sub: id, role });
};

beforeEach(() => {
  vi.resetAllMocks();
  findAuthenticationUserMock.mockImplementation(async (id: string) => ({
    id,
    role: id.startsWith('admin') ? 'ADMIN' : 'USER',
  }));
});

describe.each(['USER', 'ADMIN'] as const)('favorites routes as %s', (role) => {
  it('lists the authenticated user favorites in the required envelope', async () => {
    authenticateAs(role, `${role.toLowerCase()}-1`);
    listFavoritesMock.mockResolvedValue([recipe]);

    const response = await request(app)
      .get('/api/v1/favorites')
      .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(listFavoritesMock).toHaveBeenCalledWith(`${role.toLowerCase()}-1`);
    expect(response.body.data.recipes).toEqual([
      {
        ...recipe,
        createdAt: recipe.createdAt.toISOString(),
        updatedAt: recipe.updatedAt.toISOString(),
      },
    ]);
  });

  it('favorites with the authenticated user ID and returns 204', async () => {
    authenticateAs(role, `${role.toLowerCase()}-1`);
    favoriteRecipeMock.mockResolvedValue(undefined);

    const response = await request(app)
      .put('/api/v1/favorites/recipe-1')
      .set('Cookie', cookie);

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(favoriteRecipeMock).toHaveBeenCalledWith(
      `${role.toLowerCase()}-1`,
      'recipe-1',
    );
  });

  it('unfavorites with the authenticated user ID and returns 204', async () => {
    authenticateAs(role, `${role.toLowerCase()}-1`);
    unfavoriteRecipeMock.mockResolvedValue(undefined);

    const response = await request(app)
      .delete('/api/v1/favorites/recipe-1')
      .set('Cookie', cookie);

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(unfavoriteRecipeMock).toHaveBeenCalledWith(
      `${role.toLowerCase()}-1`,
      'recipe-1',
    );
  });
});

it.each(['get', 'put', 'delete'] as const)(
  'rejects unauthenticated %s requests',
  async (method) => {
    const requestBuilder = request(app)[method](
      method === 'get' ? '/api/v1/favorites' : '/api/v1/favorites/recipe-1',
    );
    const response = await requestBuilder;

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  },
);

it('rejects an unusable recipeId with existing validation behavior', async () => {
  authenticateAs('USER', 'user-1');

  const response = await request(app)
    .put('/api/v1/favorites/%20')
    .set('Cookie', cookie);

  expect(response.status).toBe(400);
  expect(response.body).toEqual({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
    },
  });
  expect(favoriteRecipeMock).not.toHaveBeenCalled();
});

it('returns the safe recipe not-found response', async () => {
  authenticateAs('USER', 'user-1');
  favoriteRecipeMock.mockRejectedValue(
    new ApplicationError(
      404,
      'RECIPE_NOT_FOUND',
      'The specified recipe does not exist',
    ),
  );

  const response = await request(app)
    .put('/api/v1/favorites/missing')
    .set('Cookie', cookie);

  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe('RECIPE_NOT_FOUND');
});

it('uses the safe internal error envelope for unexpected failures', async () => {
  authenticateAs('USER', 'user-1');
  listFavoritesMock.mockRejectedValue(new Error('private database failure'));
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  const response = await request(app)
    .get('/api/v1/favorites')
    .set('Cookie', cookie);

  expect(response.status).toBe(500);
  expect(response.body).toEqual({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
  expect(JSON.stringify(response.body)).not.toContain('private database');
  consoleError.mockRestore();
});
