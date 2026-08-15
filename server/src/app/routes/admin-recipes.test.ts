import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationError } from '../errors/application-error.js';

const {
  createRecipeMock,
  findAuthenticationUserMock,
  listAllRecipesMock,
  updateRecipeMock,
  verifyAccessTokenMock,
} = vi.hoisted(() => ({
    createRecipeMock: vi.fn(),
    findAuthenticationUserMock: vi.fn(),
    listAllRecipesMock: vi.fn(),
    updateRecipeMock: vi.fn(),
    verifyAccessTokenMock: vi.fn(),
  }));

vi.mock('../services/recipe-service.js', () => ({
  createRecipe: createRecipeMock,
  listAllRecipes: listAllRecipesMock,
  updateRecipe: updateRecipeMock,
}));

vi.mock('../services/authentication-service.js', () => ({
  findAuthenticationUser: findAuthenticationUserMock,
}));

vi.mock('../utils/token.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

import { app } from '../app.js';

const adminCookie = 'auth_token=admin-token';

const asAdmin = (): void => {
  verifyAccessTokenMock.mockReturnValue({ sub: 'admin-1', role: 'ADMIN' });
};

const asUser = (): void => {
  verifyAccessTokenMock.mockReturnValue({ sub: 'user-1', role: 'USER' });
};

const createdAt = new Date('2026-07-28T00:00:00.000Z');
const updatedAt = new Date('2026-07-28T00:00:00.000Z');

const recipeDetail = {
  id: 'recipe-1',
  name: 'Tomato Soup',
  description: null,
  instructions: 'Simmer everything.',
  cuisine: null,
  preparationTime: null,
  servings: null,
  imageUrl: null,
  sourceUrl: null,
  dietTags: [],
  allergens: [],
  isPublished: true,
  createdAt,
  updatedAt,
  ingredients: [],
};

const recipeSummary = {
  id: recipeDetail.id,
  name: recipeDetail.name,
  description: recipeDetail.description,
  cuisine: recipeDetail.cuisine,
  preparationTime: recipeDetail.preparationTime,
  servings: recipeDetail.servings,
  imageUrl: recipeDetail.imageUrl,
  dietTags: recipeDetail.dietTags,
  allergens: recipeDetail.allergens,
  isPublished: recipeDetail.isPublished,
  createdAt,
  updatedAt,
};

const validCreateBody = {
  name: 'Tomato Soup',
  instructions: 'Simmer everything.',
  ingredients: [{ ingredientId: 'ingredient-1' }],
};

beforeEach(() => {
  vi.resetAllMocks();
  findAuthenticationUserMock.mockImplementation(async (id: string) => ({
    id,
    role: id.startsWith('admin') ? 'ADMIN' : 'USER',
  }));
});

describe('GET /api/v1/admin/recipes', () => {
  it('rejects an unauthenticated request', async () => {
    const response = await request(app).get('/api/v1/admin/recipes');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(listAllRecipesMock).not.toHaveBeenCalled();
  });

  it('rejects a non-admin user', async () => {
    asUser();

    const response = await request(app)
      .get('/api/v1/admin/recipes')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(listAllRecipesMock).not.toHaveBeenCalled();
  });

  it('returns published and unpublished recipes to an admin', async () => {
    asAdmin();
    const unpublished = {
      ...recipeSummary,
      id: 'recipe-2',
      name: 'Unpublished Soup',
      isPublished: false,
    };
    listAllRecipesMock.mockResolvedValue({
      recipes: [recipeSummary, unpublished],
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
    });

    const response = await request(app)
      .get('/api/v1/admin/recipes')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.data.recipes).toEqual([
      {
        ...recipeSummary,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
      {
        ...unpublished,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
    ]);
    expect(response.body.data.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
    });
  });

  it('applies default pagination', async () => {
    asAdmin();
    listAllRecipesMock.mockResolvedValue({
      recipes: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });

    await request(app)
      .get('/api/v1/admin/recipes')
      .set('Cookie', adminCookie);

    expect(listAllRecipesMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
    });
  });

  it('passes explicit pagination to the service', async () => {
    asAdmin();
    listAllRecipesMock.mockResolvedValue({
      recipes: [],
      page: 2,
      pageSize: 5,
      total: 0,
      totalPages: 0,
    });

    const response = await request(app)
      .get('/api/v1/admin/recipes?page=2&pageSize=5')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(listAllRecipesMock).toHaveBeenCalledWith({ page: 2, pageSize: 5 });
  });

  it('returns a valid empty response', async () => {
    asAdmin();
    listAllRecipesMock.mockResolvedValue({
      recipes: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });

    const response = await request(app)
      .get('/api/v1/admin/recipes')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
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
});

describe('POST /api/v1/admin/recipes', () => {
  it('rejects an unauthenticated request', async () => {
    const response = await request(app)
      .post('/api/v1/admin/recipes')
      .send(validCreateBody);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(createRecipeMock).not.toHaveBeenCalled();
  });

  it('rejects a non-admin user', async () => {
    asUser();

    const response = await request(app)
      .post('/api/v1/admin/recipes')
      .set('Cookie', adminCookie)
      .send(validCreateBody);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(createRecipeMock).not.toHaveBeenCalled();
  });

  it('creates a recipe for an admin and returns the response envelope', async () => {
    asAdmin();
    createRecipeMock.mockResolvedValue(recipeDetail);

    const response = await request(app)
      .post('/api/v1/admin/recipes')
      .set('Cookie', adminCookie)
      .send({
        name: '  Tomato Soup  ',
        instructions: 'Simmer everything.',
        ingredients: [{ ingredientId: 'ingredient-1' }],
      });

    expect(response.status).toBe(201);
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

  it('calls the service with the parsed and defaulted input, not the raw body', async () => {
    asAdmin();
    createRecipeMock.mockResolvedValue(recipeDetail);

    await request(app)
      .post('/api/v1/admin/recipes')
      .set('Cookie', adminCookie)
      .send({
        name: '  Tomato Soup  ',
        instructions: 'Simmer everything.',
        ingredients: [{ ingredientId: 'ingredient-1' }],
      });

    expect(createRecipeMock).toHaveBeenCalledWith({
      name: 'Tomato Soup',
      instructions: 'Simmer everything.',
      dietTags: [],
      allergens: [],
      isPublished: true,
      ingredients: [{ ingredientId: 'ingredient-1', category: 'OTHER' }],
    });
  });

  it('rejects invalid input with a validation error', async () => {
    asAdmin();

    const response = await request(app)
      .post('/api/v1/admin/recipes')
      .set('Cookie', adminCookie)
      .send({ name: 'A', instructions: '', ingredients: [] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    expect(createRecipeMock).not.toHaveBeenCalled();
  });

  it('rejects duplicate ingredientIds before reaching the service', async () => {
    asAdmin();

    const response = await request(app)
      .post('/api/v1/admin/recipes')
      .set('Cookie', adminCookie)
      .send({
        name: 'Tomato Soup',
        instructions: 'Simmer everything.',
        ingredients: [
          { ingredientId: 'ingredient-1' },
          { ingredientId: 'ingredient-1' },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(createRecipeMock).not.toHaveBeenCalled();
  });

  it('maps a missing ingredient error from the service', async () => {
    asAdmin();
    createRecipeMock.mockRejectedValue(
      new ApplicationError(
        404,
        'INGREDIENT_NOT_FOUND',
        'One or more referenced ingredients do not exist',
      ),
    );

    const response = await request(app)
      .post('/api/v1/admin/recipes')
      .set('Cookie', adminCookie)
      .send(validCreateBody);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'INGREDIENT_NOT_FOUND',
        message: 'One or more referenced ingredients do not exist',
      },
    });
  });
});

describe('PATCH /api/v1/admin/recipes/:id', () => {
  it('rejects an unauthenticated request', async () => {
    const response = await request(app)
      .patch('/api/v1/admin/recipes/recipe-1')
      .send({ name: 'Updated Soup' });

    expect(response.status).toBe(401);
    expect(updateRecipeMock).not.toHaveBeenCalled();
  });

  it('rejects a non-admin user', async () => {
    asUser();

    const response = await request(app)
      .patch('/api/v1/admin/recipes/recipe-1')
      .set('Cookie', adminCookie)
      .send({ name: 'Updated Soup' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(updateRecipeMock).not.toHaveBeenCalled();
  });

  it('updates a recipe for an admin and returns the response envelope', async () => {
    asAdmin();
    updateRecipeMock.mockResolvedValue({
      ...recipeDetail,
      name: 'Updated Soup',
    });

    const response = await request(app)
      .patch('/api/v1/admin/recipes/recipe-1')
      .set('Cookie', adminCookie)
      .send({ name: 'Updated Soup' });

    expect(response.status).toBe(200);
    expect(updateRecipeMock).toHaveBeenCalledWith('recipe-1', {
      name: 'Updated Soup',
    });
    expect(response.body).toEqual({
      data: {
        recipe: {
          ...recipeDetail,
          name: 'Updated Soup',
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
      },
    });
  });

  it('passes an explicit null through the real schema to clear a field', async () => {
    asAdmin();
    updateRecipeMock.mockResolvedValue({
      ...recipeDetail,
      description: null,
    });

    const response = await request(app)
      .patch('/api/v1/admin/recipes/recipe-1')
      .set('Cookie', adminCookie)
      .send({ description: null });

    expect(response.status).toBe(200);
    expect(updateRecipeMock).toHaveBeenCalledWith('recipe-1', {
      description: null,
    });
  });

  it('rejects an invalid update body with a validation error', async () => {
    asAdmin();

    const response = await request(app)
      .patch('/api/v1/admin/recipes/recipe-1')
      .set('Cookie', adminCookie)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    expect(updateRecipeMock).not.toHaveBeenCalled();
  });

  it('rejects duplicate ingredientIds before reaching the service', async () => {
    asAdmin();

    const response = await request(app)
      .patch('/api/v1/admin/recipes/recipe-1')
      .set('Cookie', adminCookie)
      .send({
        ingredients: [
          { ingredientId: 'ingredient-1' },
          { ingredientId: 'ingredient-1' },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(updateRecipeMock).not.toHaveBeenCalled();
  });

  it('maps a missing ingredient error from the service', async () => {
    asAdmin();
    updateRecipeMock.mockRejectedValue(
      new ApplicationError(
        404,
        'INGREDIENT_NOT_FOUND',
        'One or more referenced ingredients do not exist',
      ),
    );

    const response = await request(app)
      .patch('/api/v1/admin/recipes/recipe-1')
      .set('Cookie', adminCookie)
      .send({ ingredients: [{ ingredientId: 'missing-ingredient' }] });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'INGREDIENT_NOT_FOUND',
        message: 'One or more referenced ingredients do not exist',
      },
    });
  });

  it('maps a missing recipe error from the service', async () => {
    asAdmin();
    updateRecipeMock.mockRejectedValue(
      new ApplicationError(
        404,
        'RECIPE_NOT_FOUND',
        'The specified recipe does not exist',
      ),
    );

    const response = await request(app)
      .patch('/api/v1/admin/recipes/missing-recipe')
      .set('Cookie', adminCookie)
      .send({ name: 'Updated Soup' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'RECIPE_NOT_FOUND',
        message: 'The specified recipe does not exist',
      },
    });
  });
});
