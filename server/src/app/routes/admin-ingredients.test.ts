import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listCanonicalIngredientsMock, verifyAccessTokenMock } = vi.hoisted(
  () => ({
    listCanonicalIngredientsMock: vi.fn(),
    verifyAccessTokenMock: vi.fn(),
  }),
);

vi.mock('../services/ingredient-service.js', () => ({
  listCanonicalIngredients: listCanonicalIngredientsMock,
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

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/v1/admin/ingredients', () => {
  it('returns canonical ingredient references to an admin', async () => {
    asAdmin();
    const ingredients = [
      { id: 'ingredient-1', name: 'apple' },
      { id: 'ingredient-2', name: 'tomato' },
    ];
    listCanonicalIngredientsMock.mockResolvedValue(ingredients);

    const response = await request(app)
      .get('/api/v1/admin/ingredients')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { ingredients } });
  });

  it('preserves the repository alphabetical ordering', async () => {
    asAdmin();
    listCanonicalIngredientsMock.mockResolvedValue([
      { id: 'ingredient-1', name: 'apple' },
      { id: 'ingredient-2', name: 'tomato' },
    ]);

    const response = await request(app)
      .get('/api/v1/admin/ingredients')
      .set('Cookie', adminCookie);

    expect(
      response.body.data.ingredients.map(
        (ingredient: { name: string }) => ingredient.name,
      ),
    ).toEqual(['apple', 'tomato']);
  });

  it('returns an empty ingredient array', async () => {
    asAdmin();
    listCanonicalIngredientsMock.mockResolvedValue([]);

    const response = await request(app)
      .get('/api/v1/admin/ingredients')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { ingredients: [] } });
  });

  it('rejects a non-admin user', async () => {
    asUser();

    const response = await request(app)
      .get('/api/v1/admin/ingredients')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(listCanonicalIngredientsMock).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).get('/api/v1/admin/ingredients');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(listCanonicalIngredientsMock).not.toHaveBeenCalled();
  });
});
