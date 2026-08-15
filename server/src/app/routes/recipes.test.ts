import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationError } from '../errors/application-error.js';

const {
  findAuthenticationUserMock,
  getRecipeByIdForUserMock,
  listPublishedRecipesMock,
  verifyAccessTokenMock,
} = vi.hoisted(() => ({
  findAuthenticationUserMock: vi.fn(),
  getRecipeByIdForUserMock: vi.fn(),
  listPublishedRecipesMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../services/authentication-service.js', () => ({
  findAuthenticationUser: findAuthenticationUserMock,
}));

vi.mock('../services/recipe-service.js', () => ({
  getRecipeByIdForUser: getRecipeByIdForUserMock,
  listPublishedRecipes: listPublishedRecipesMock,
}));

vi.mock('../utils/token.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

import { app } from '../app.js';

const userCookie = 'auth_token=user-token';
const adminCookie = 'auth_token=admin-token';

const asUser = (): void => {
  verifyAccessTokenMock.mockReturnValue({ sub: 'user-1', role: 'USER' });
};

const asAdmin = (): void => {
  verifyAccessTokenMock.mockReturnValue({ sub: 'admin-1', role: 'ADMIN' });
};

const createdAt = new Date('2026-07-28T00:00:00.000Z');
const updatedAt = new Date('2026-07-28T00:00:00.000Z');

const recipeSummary = {
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
  createdAt,
  updatedAt,
};

const recipeDetail = {
  ...recipeSummary,
  instructions: 'Simmer everything.',
  sourceUrl: null,
  ingredients: [],
  isFavorite: false,
};

beforeEach(() => {
  vi.resetAllMocks();
  findAuthenticationUserMock.mockImplementation(async (id: string) => ({
    id,
    role: id.startsWith('admin') ? 'ADMIN' : 'USER',
  }));
});

describe('GET /api/v1/recipes', () => {
  it('rejects an unauthenticated request', async () => {
    const response = await request(app).get('/api/v1/recipes');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(listPublishedRecipesMock).not.toHaveBeenCalled();
  });

  it('returns recipes with a pagination envelope for an authenticated user', async () => {
    asUser();
    listPublishedRecipesMock.mockResolvedValue({
      recipes: [recipeSummary],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    const response = await request(app)
      .get('/api/v1/recipes')
      .set('Cookie', userCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        recipes: [
          {
            ...recipeSummary,
            createdAt: createdAt.toISOString(),
            updatedAt: updatedAt.toISOString(),
          },
        ],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    });
  });

  it('applies default pagination when no query params are given', async () => {
    asUser();
    listPublishedRecipesMock.mockResolvedValue({
      recipes: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });

    await request(app).get('/api/v1/recipes').set('Cookie', userCookie);

    expect(listPublishedRecipesMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
    });
  });

  it('passes explicit page and pageSize through to the service', async () => {
    asUser();
    listPublishedRecipesMock.mockResolvedValue({
      recipes: [],
      page: 2,
      pageSize: 5,
      total: 0,
      totalPages: 0,
    });

    await request(app)
      .get('/api/v1/recipes?page=2&pageSize=5')
      .set('Cookie', userCookie);

    expect(listPublishedRecipesMock).toHaveBeenCalledWith({
      page: 2,
      pageSize: 5,
    });
  });

  it('rejects invalid pagination with a validation error', async () => {
    asUser();

    const response = await request(app)
      .get('/api/v1/recipes?page=0')
      .set('Cookie', userCookie);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    expect(listPublishedRecipesMock).not.toHaveBeenCalled();
  });

  it('rejects an unsupported cuisine filter instead of silently ignoring it', async () => {
    asUser();

    const response = await request(app)
      .get('/api/v1/recipes?cuisine=Italian')
      .set('Cookie', userCookie);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'UNSUPPORTED_RECIPE_FILTER',
        message:
          'Cuisine and maximum preparation time filters are not supported yet',
      },
    });
    expect(listPublishedRecipesMock).not.toHaveBeenCalled();
  });

  it('rejects an unsupported maxPreparationTime filter instead of silently ignoring it', async () => {
    asUser();

    const response = await request(app)
      .get('/api/v1/recipes?maxPreparationTime=30')
      .set('Cookie', userCookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('UNSUPPORTED_RECIPE_FILTER');
    expect(listPublishedRecipesMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/recipes/:id', () => {
  it('rejects an unauthenticated request', async () => {
    const response = await request(app).get('/api/v1/recipes/recipe-1');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(getRecipeByIdForUserMock).not.toHaveBeenCalled();
  });

  it('returns the recipe detail for an authenticated regular user', async () => {
    asUser();
    getRecipeByIdForUserMock.mockResolvedValue(recipeDetail);

    const response = await request(app)
      .get('/api/v1/recipes/recipe-1')
      .set('Cookie', userCookie);

    expect(response.status).toBe(200);
    expect(getRecipeByIdForUserMock).toHaveBeenCalledWith(
      'recipe-1',
      'user-1',
      'USER',
    );
    expect(response.body).toEqual({
      data: {
        recipe: {
          ...recipeDetail,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
      },
    });
  });

  it('calls the service with the ADMIN role for an admin requester', async () => {
    asAdmin();
    getRecipeByIdForUserMock.mockResolvedValue({
      ...recipeDetail,
      isPublished: false,
    });

    const response = await request(app)
      .get('/api/v1/recipes/recipe-1')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(getRecipeByIdForUserMock).toHaveBeenCalledWith(
      'recipe-1',
      'admin-1',
      'ADMIN',
    );
    expect(response.body.data.recipe.isPublished).toBe(false);
  });

  it('maps a missing recipe to the service error response', async () => {
    asUser();
    getRecipeByIdForUserMock.mockRejectedValue(
      new ApplicationError(
        404,
        'RECIPE_NOT_FOUND',
        'The specified recipe does not exist',
      ),
    );

    const response = await request(app)
      .get('/api/v1/recipes/missing-recipe')
      .set('Cookie', userCookie);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'RECIPE_NOT_FOUND',
        message: 'The specified recipe does not exist',
      },
    });
  });

  it('lets the service hide an unpublished recipe from a regular user as a 404', async () => {
    asUser();
    getRecipeByIdForUserMock.mockRejectedValue(
      new ApplicationError(
        404,
        'RECIPE_NOT_FOUND',
        'The specified recipe does not exist',
      ),
    );

    const response = await request(app)
      .get('/api/v1/recipes/unpublished-recipe')
      .set('Cookie', userCookie);

    expect(response.status).toBe(404);
    expect(getRecipeByIdForUserMock).toHaveBeenCalledWith(
      'unpublished-recipe',
      'user-1',
      'USER',
    );
  });

  it('rejects a whitespace-only id param with a validation error', async () => {
    asUser();

    const response = await request(app)
      .get('/api/v1/recipes/%20')
      .set('Cookie', userCookie);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    expect(getRecipeByIdForUserMock).not.toHaveBeenCalled();
  });
});
