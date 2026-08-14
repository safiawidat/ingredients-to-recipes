import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationError } from '../errors/application-error.js';

const { recommendRecipesMock, verifyAccessTokenMock } = vi.hoisted(() => ({
  recommendRecipesMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../services/recommendation-service.js', () => ({
  recommendRecipes: recommendRecipesMock,
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

const serviceResult = {
  recognizedIngredients: [{ id: 'ingredient-tomato', name: 'tomato' }],
  unknownIngredients: ['dragon fruit'],
  recommendations: [
    {
      recipe: {
        id: 'recipe-1',
        name: 'Tomato Pasta',
        description: null,
        cuisine: null,
        preparationTime: 30,
        servings: 2,
        imageUrl: null,
        dietTags: [],
        allergens: [],
      },
      score: 0.75,
      distance: 0.25,
      matchPercentage: 75,
      matchedIngredients: [
        { id: 'ingredient-tomato', name: 'tomato' },
      ],
      missingIngredients: [{ id: 'ingredient-basil', name: 'basil' }],
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  recommendRecipesMock.mockResolvedValue(serviceResult);
});

describe('POST /api/v1/recommendations', () => {
  it('rejects an unauthenticated request without invoking the service', async () => {
    const response = await request(app)
      .post('/api/v1/recommendations')
      .send({ ingredients: ['tomato'] });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      },
    });
    expect(recommendRecipesMock).not.toHaveBeenCalled();
  });

  it('allows an authenticated USER and invokes the service once', async () => {
    asUser();

    const response = await request(app)
      .post('/api/v1/recommendations')
      .set('Cookie', userCookie)
      .send({ ingredients: ['tomato'] });

    expect(response.status).toBe(200);
    expect(recommendRecipesMock).toHaveBeenCalledTimes(1);
  });

  it('allows an authenticated ADMIN without an admin-only restriction', async () => {
    asAdmin();

    const response = await request(app)
      .post('/api/v1/recommendations')
      .set('Cookie', adminCookie)
      .send({ ingredients: ['tomato'] });

    expect(response.status).toBe(200);
    expect(recommendRecipesMock).toHaveBeenCalledTimes(1);
  });

  it('applies the default limit and preserves raw ingredients', async () => {
    asUser();

    await request(app)
      .post('/api/v1/recommendations')
      .set('Cookie', userCookie)
      .send({ ingredients: [' Tomato '] });

    expect(recommendRecipesMock).toHaveBeenCalledWith('user-1', {
      ingredients: [' Tomato '],
      limit: 5,
    });
  });

  it('forwards an explicit valid limit', async () => {
    asUser();

    await request(app)
      .post('/api/v1/recommendations')
      .set('Cookie', userCookie)
      .send({ ingredients: ['tomato'], limit: 3 });

    expect(recommendRecipesMock).toHaveBeenCalledWith('user-1', {
      ingredients: ['tomato'],
      limit: 3,
    });
  });

  it('forwards an exact filtered payload', async () => {
    asUser();
    const filters = {
      cuisine: 'Mediterranean-inspired',
      maxPreparationTime: 30,
      dietaryType: 'vegan',
      excludeAllergens: ['peanut', 'soy'],
    };

    const response = await request(app)
      .post('/api/v1/recommendations')
      .set('Cookie', userCookie)
      .send({ ingredients: ['tomato', 'rice'], limit: 5, filters });

    expect(response.status).toBe(200);
    expect(recommendRecipesMock).toHaveBeenCalledWith('user-1', {
      ingredients: ['tomato', 'rice'],
      limit: 5,
      filters,
    });
  });

  it('accepts and forwards an empty filters object', async () => {
    asUser();

    const response = await request(app)
      .post('/api/v1/recommendations')
      .set('Cookie', userCookie)
      .send({ ingredients: ['tomato'], filters: {} });

    expect(response.status).toBe(200);
    expect(recommendRecipesMock).toHaveBeenCalledWith('user-1', {
      ingredients: ['tomato'],
      limit: 5,
      filters: {},
    });
  });

  it.each([
    ['invalid cuisine', { cuisine: 'Mediterranean' }],
    ['string max time', { maxPreparationTime: '30' }],
    ['invalid dietary type', { dietaryType: 'high-protein' }],
    ['invalid allergen', { excludeAllergens: ['nuts'] }],
    ['unknown nested key', { calories: 500 }],
  ])('rejects %s with the standard validation envelope', async (_name, filters) => {
    asUser();

    const response = await request(app)
      .post('/api/v1/recommendations')
      .set('Cookie', userCookie)
      .send({ ingredients: ['tomato'], filters });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    expect(recommendRecipesMock).not.toHaveBeenCalled();
  });

  it('returns the service result unchanged under the data envelope', async () => {
    asUser();

    const response = await request(app)
      .post('/api/v1/recommendations')
      .set('Cookie', userCookie)
      .send({ ingredients: ['tomato', 'dragon fruit'] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: serviceResult });
  });

  it('returns recognized and unknown ingredients from the service result', async () => {
    asUser();

    const response = await request(app)
      .post('/api/v1/recommendations')
      .set('Cookie', userCookie)
      .send({ ingredients: ['tomato', 'dragon fruit'] });

    expect(response.body.data.recognizedIngredients).toEqual(
      serviceResult.recognizedIngredients,
    );
    expect(response.body.data.unknownIngredients).toEqual(['dragon fruit']);
  });

  it('returns HTTP 200 with an empty recommendation list', async () => {
    asUser();
    recommendRecipesMock.mockResolvedValue({
      recognizedIngredients: serviceResult.recognizedIngredients,
      unknownIngredients: [],
      recommendations: [],
    });

    const response = await request(app)
      .post('/api/v1/recommendations')
      .set('Cookie', userCookie)
      .send({ ingredients: ['tomato'] });

    expect(response.status).toBe(200);
    expect(response.body.data.recommendations).toEqual([]);
  });

  it('passes the no-recognized service error to the standard error handler', async () => {
    asUser();
    recommendRecipesMock.mockRejectedValue(
      new ApplicationError(
        400,
        'NO_RECOGNIZED_INGREDIENTS',
        'At least one ingredient must match a known ingredient',
      ),
    );

    const response = await request(app)
      .post('/api/v1/recommendations')
      .set('Cookie', userCookie)
      .send({ ingredients: ['unknown'] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'NO_RECOGNIZED_INGREDIENTS',
        message: 'At least one ingredient must match a known ingredient',
      },
    });
  });

  it.each([
    ['missing ingredients', {}],
    ['an empty array', { ingredients: [] }],
    [
      'more than 50 ingredients',
      {
        ingredients: Array.from(
          { length: 51 },
          (_, index) => `item-${index}`,
        ),
      },
    ],
    ['a non-string ingredient', { ingredients: ['tomato', 42] }],
    ['an ingredient over 100 characters', { ingredients: ['a'.repeat(101)] }],
    ['all-whitespace ingredients', { ingredients: ['', '   ', '\t'] }],
    ['limit 0', { ingredients: ['tomato'], limit: 0 }],
    ['limit 21', { ingredients: ['tomato'], limit: 21 }],
    ['a non-integer limit', { ingredients: ['tomato'], limit: 1.5 }],
  ])('rejects %s using the standard validation envelope', async (_name, body) => {
    asUser();

    const response = await request(app)
      .post('/api/v1/recommendations')
      .set('Cookie', userCookie)
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    expect(recommendRecipesMock).not.toHaveBeenCalled();
  });
});
