import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createIngredientAliasMock,
  deleteIngredientAliasMock,
  findManyIngredientAliasMock,
  findUniqueIngredientMock,
  findUniqueIngredientAliasMock,
  updateIngredientAliasMock,
  verifyAccessTokenMock,
} = vi.hoisted(() => ({
  createIngredientAliasMock: vi.fn(),
  deleteIngredientAliasMock: vi.fn(),
  findManyIngredientAliasMock: vi.fn(),
  findUniqueIngredientMock: vi.fn(),
  findUniqueIngredientAliasMock: vi.fn(),
  updateIngredientAliasMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../../database/prisma.js', () => ({
  prisma: {
    ingredient: {
      findUnique: findUniqueIngredientMock,
    },
    ingredientAlias: {
      findUnique: findUniqueIngredientAliasMock,
      findMany: findManyIngredientAliasMock,
      create: createIngredientAliasMock,
      update: updateIngredientAliasMock,
      delete: deleteIngredientAliasMock,
    },
  },
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

const tomato = { id: 'ingredient-1', name: 'tomato' };
const aliasRecord = {
  id: 'alias-1',
  alias: 'love apple',
  ingredientId: 'ingredient-1',
  createdAt: new Date('2026-07-28T00:00:00.000Z'),
  ingredient: tomato,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/v1/admin/ingredient-aliases', () => {
  it('returns aliases with their canonical ingredient for an admin', async () => {
    asAdmin();
    findManyIngredientAliasMock.mockResolvedValue([aliasRecord]);

    const response = await request(app)
      .get('/api/v1/admin/ingredient-aliases')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        aliases: [
          {
            ...aliasRecord,
            createdAt: aliasRecord.createdAt.toISOString(),
          },
        ],
      },
    });
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).get(
      '/api/v1/admin/ingredient-aliases',
    );

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(findManyIngredientAliasMock).not.toHaveBeenCalled();
  });

  it('rejects a non-admin user', async () => {
    asUser();

    const response = await request(app)
      .get('/api/v1/admin/ingredient-aliases')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(findManyIngredientAliasMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/admin/ingredient-aliases', () => {
  it('creates an alias for an admin', async () => {
    asAdmin();
    findUniqueIngredientMock.mockResolvedValue({ id: 'ingredient-1' });
    findUniqueIngredientAliasMock.mockResolvedValue(null);
    createIngredientAliasMock.mockResolvedValue(aliasRecord);

    const response = await request(app)
      .post('/api/v1/admin/ingredient-aliases')
      .set('Cookie', adminCookie)
      .send({ alias: ' Love Apple ', ingredientId: 'ingredient-1' });

    expect(response.status).toBe(201);
    expect(createIngredientAliasMock).toHaveBeenCalledWith({
      data: { alias: 'love apple', ingredientId: 'ingredient-1' },
      select: expect.any(Object),
    });
    expect(response.body).toEqual({
      data: {
        alias: {
          ...aliasRecord,
          createdAt: aliasRecord.createdAt.toISOString(),
        },
      },
    });
  });

  it('rejects invalid input with a validation error', async () => {
    asAdmin();

    const response = await request(app)
      .post('/api/v1/admin/ingredient-aliases')
      .set('Cookie', adminCookie)
      .send({ alias: '', ingredientId: '' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    expect(findUniqueIngredientMock).not.toHaveBeenCalled();
  });

  it('rejects a missing ingredient', async () => {
    asAdmin();
    findUniqueIngredientMock.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/v1/admin/ingredient-aliases')
      .set('Cookie', adminCookie)
      .send({ alias: 'love apple', ingredientId: 'missing-ingredient' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'INGREDIENT_NOT_FOUND',
        message: 'The specified ingredient does not exist',
      },
    });
    expect(findUniqueIngredientAliasMock).not.toHaveBeenCalled();
  });

  it('rejects a duplicate alias', async () => {
    asAdmin();
    findUniqueIngredientMock.mockResolvedValue({ id: 'ingredient-1' });
    findUniqueIngredientAliasMock.mockResolvedValue({ id: 'alias-1' });

    const response = await request(app)
      .post('/api/v1/admin/ingredient-aliases')
      .set('Cookie', adminCookie)
      .send({ alias: 'love apple', ingredientId: 'ingredient-1' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: 'ALIAS_ALREADY_EXISTS',
        message: 'An alias with this name already exists',
      },
    });
    expect(createIngredientAliasMock).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app)
      .post('/api/v1/admin/ingredient-aliases')
      .send({ alias: 'love apple', ingredientId: 'ingredient-1' });

    expect(response.status).toBe(401);
    expect(createIngredientAliasMock).not.toHaveBeenCalled();
  });

  it('rejects a non-admin user', async () => {
    asUser();

    const response = await request(app)
      .post('/api/v1/admin/ingredient-aliases')
      .set('Cookie', adminCookie)
      .send({ alias: 'love apple', ingredientId: 'ingredient-1' });

    expect(response.status).toBe(403);
    expect(createIngredientAliasMock).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/v1/admin/ingredient-aliases/:id', () => {
  it('updates an alias for an admin', async () => {
    asAdmin();
    findUniqueIngredientAliasMock.mockResolvedValue({ id: 'alias-1' });
    updateIngredientAliasMock.mockResolvedValue({
      ...aliasRecord,
      alias: 'tomatoes',
    });

    const response = await request(app)
      .patch('/api/v1/admin/ingredient-aliases/alias-1')
      .set('Cookie', adminCookie)
      .send({ alias: 'Tomatoes' });

    expect(response.status).toBe(200);
    expect(updateIngredientAliasMock).toHaveBeenCalledWith({
      where: { id: 'alias-1' },
      data: { alias: 'tomatoes' },
      select: expect.any(Object),
    });
    expect(response.body.data.alias.alias).toBe('tomatoes');
  });

  it('re-parents an alias to a different ingredient without changing its text', async () => {
    asAdmin();
    findUniqueIngredientAliasMock.mockResolvedValue({ id: 'alias-1' });
    findUniqueIngredientMock.mockResolvedValue({ id: 'ingredient-2' });
    updateIngredientAliasMock.mockResolvedValue({
      ...aliasRecord,
      ingredientId: 'ingredient-2',
      ingredient: { id: 'ingredient-2', name: 'green onion' },
    });

    const response = await request(app)
      .patch('/api/v1/admin/ingredient-aliases/alias-1')
      .set('Cookie', adminCookie)
      .send({ ingredientId: 'ingredient-2' });

    expect(response.status).toBe(200);
    expect(updateIngredientAliasMock).toHaveBeenCalledWith({
      where: { id: 'alias-1' },
      data: { ingredientId: 'ingredient-2' },
      select: expect.any(Object),
    });
    expect(response.body.data.alias.ingredient).toEqual({
      id: 'ingredient-2',
      name: 'green onion',
    });
  });

  it('returns 404 when the alias does not exist', async () => {
    asAdmin();
    findUniqueIngredientAliasMock.mockResolvedValue(null);

    const response = await request(app)
      .patch('/api/v1/admin/ingredient-aliases/missing-alias')
      .set('Cookie', adminCookie)
      .send({ alias: 'tomatoes' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'ALIAS_NOT_FOUND',
        message: 'The specified alias does not exist',
      },
    });
    expect(updateIngredientAliasMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the new ingredient does not exist', async () => {
    asAdmin();
    findUniqueIngredientAliasMock.mockResolvedValue({ id: 'alias-1' });
    findUniqueIngredientMock.mockResolvedValue(null);

    const response = await request(app)
      .patch('/api/v1/admin/ingredient-aliases/alias-1')
      .set('Cookie', adminCookie)
      .send({ ingredientId: 'missing-ingredient' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'INGREDIENT_NOT_FOUND',
        message: 'The specified ingredient does not exist',
      },
    });
    expect(updateIngredientAliasMock).not.toHaveBeenCalled();
  });

  it('rejects a conflicting alias', async () => {
    asAdmin();
    findUniqueIngredientAliasMock
      .mockResolvedValueOnce({ id: 'alias-1' })
      .mockResolvedValueOnce({ id: 'alias-2' });

    const response = await request(app)
      .patch('/api/v1/admin/ingredient-aliases/alias-1')
      .set('Cookie', adminCookie)
      .send({ alias: 'scallion' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: 'ALIAS_ALREADY_EXISTS',
        message: 'An alias with this name already exists',
      },
    });
    expect(updateIngredientAliasMock).not.toHaveBeenCalled();
  });

  it('rejects invalid input with a validation error', async () => {
    asAdmin();

    const response = await request(app)
      .patch('/api/v1/admin/ingredient-aliases/alias-1')
      .set('Cookie', adminCookie)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    expect(findUniqueIngredientAliasMock).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app)
      .patch('/api/v1/admin/ingredient-aliases/alias-1')
      .send({ alias: 'tomatoes' });

    expect(response.status).toBe(401);
    expect(updateIngredientAliasMock).not.toHaveBeenCalled();
  });

  it('rejects a non-admin user', async () => {
    asUser();

    const response = await request(app)
      .patch('/api/v1/admin/ingredient-aliases/alias-1')
      .set('Cookie', adminCookie)
      .send({ alias: 'tomatoes' });

    expect(response.status).toBe(403);
    expect(updateIngredientAliasMock).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/v1/admin/ingredient-aliases/:id', () => {
  it('deletes an alias for an admin', async () => {
    asAdmin();
    findUniqueIngredientAliasMock.mockResolvedValue({ id: 'alias-1' });
    deleteIngredientAliasMock.mockResolvedValue(aliasRecord);

    const response = await request(app)
      .delete('/api/v1/admin/ingredient-aliases/alias-1')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(204);
    expect(deleteIngredientAliasMock).toHaveBeenCalledWith({
      where: { id: 'alias-1' },
    });
  });

  it('returns 404 when the alias does not exist', async () => {
    asAdmin();
    findUniqueIngredientAliasMock.mockResolvedValue(null);

    const response = await request(app)
      .delete('/api/v1/admin/ingredient-aliases/missing-alias')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'ALIAS_NOT_FOUND',
        message: 'The specified alias does not exist',
      },
    });
    expect(deleteIngredientAliasMock).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).delete(
      '/api/v1/admin/ingredient-aliases/alias-1',
    );

    expect(response.status).toBe(401);
    expect(deleteIngredientAliasMock).not.toHaveBeenCalled();
  });

  it('rejects a non-admin user', async () => {
    asUser();

    const response = await request(app)
      .delete('/api/v1/admin/ingredient-aliases/alias-1')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(403);
    expect(deleteIngredientAliasMock).not.toHaveBeenCalled();
  });
});
