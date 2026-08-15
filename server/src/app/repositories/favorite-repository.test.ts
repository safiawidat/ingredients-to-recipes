import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deleteManyMock, findManyMock, upsertMock } = vi.hoisted(() => ({
  deleteManyMock: vi.fn(),
  findManyMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock('../../database/prisma.js', () => ({
  prisma: {
    favorite: {
      deleteMany: deleteManyMock,
      findMany: findManyMock,
      upsert: upsertMock,
    },
  },
}));

import {
  deleteFavorite,
  findPublishedFavoriteRecipes,
  upsertFavorite,
} from './favorite-repository.js';

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

beforeEach(() => {
  vi.resetAllMocks();
});

describe('findPublishedFavoriteRecipes', () => {
  it('uses one user-scoped, published-only query with deterministic ordering', async () => {
    findManyMock.mockResolvedValue([{ recipe }]);

    await findPublishedFavoriteRecipes('user-1');

    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        recipe: { isPublished: true },
      },
      orderBy: [{ createdAt: 'desc' }, { recipeId: 'asc' }],
      select: {
        recipe: {
          select: {
            id: true,
            name: true,
            description: true,
            cuisine: true,
            preparationTime: true,
            servings: true,
            imageUrl: true,
            dietTags: true,
            allergens: true,
            isPublished: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  });

  it('unwraps recipes while preserving newest-first repository order', async () => {
    const secondRecipe = { ...recipe, id: 'recipe-2', name: 'Second' };
    findManyMock.mockResolvedValue([
      { recipe: secondRecipe },
      { recipe },
    ]);

    await expect(findPublishedFavoriteRecipes('user-1')).resolves.toEqual([
      secondRecipe,
      recipe,
    ]);
  });

  it('propagates database errors', async () => {
    const error = new Error('database failure');
    findManyMock.mockRejectedValue(error);

    await expect(findPublishedFavoriteRecipes('user-1')).rejects.toBe(error);
  });
});

describe('upsertFavorite', () => {
  it('uses the compound user and recipe uniqueness for an idempotent upsert', async () => {
    upsertMock.mockResolvedValue({});

    await upsertFavorite('user-1', 'recipe-1');

    expect(upsertMock).toHaveBeenCalledWith({
      where: {
        userId_recipeId: { userId: 'user-1', recipeId: 'recipe-1' },
      },
      create: { userId: 'user-1', recipeId: 'recipe-1' },
      update: {},
    });
  });

  it('propagates database errors', async () => {
    const error = new Error('database failure');
    upsertMock.mockRejectedValue(error);

    await expect(upsertFavorite('user-1', 'recipe-1')).rejects.toBe(error);
  });
});

describe('deleteFavorite', () => {
  it('uses deleteMany scoped to both userId and recipeId', async () => {
    deleteManyMock.mockResolvedValue({ count: 0 });

    await deleteFavorite('user-1', 'recipe-1');

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { userId: 'user-1', recipeId: 'recipe-1' },
    });
  });

  it('propagates database errors', async () => {
    const error = new Error('database failure');
    deleteManyMock.mockRejectedValue(error);

    await expect(deleteFavorite('user-1', 'recipe-1')).rejects.toBe(error);
  });
});
