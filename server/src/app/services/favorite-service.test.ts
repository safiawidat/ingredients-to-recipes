import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  deleteFavoriteMock,
  findPublishedFavoriteRecipesMock,
  findRecipeByIdMock,
  upsertFavoriteMock,
} = vi.hoisted(() => ({
  deleteFavoriteMock: vi.fn(),
  findPublishedFavoriteRecipesMock: vi.fn(),
  findRecipeByIdMock: vi.fn(),
  upsertFavoriteMock: vi.fn(),
}));

vi.mock('../repositories/favorite-repository.js', () => ({
  deleteFavorite: deleteFavoriteMock,
  findPublishedFavoriteRecipes: findPublishedFavoriteRecipesMock,
  upsertFavorite: upsertFavoriteMock,
}));

vi.mock('../repositories/recipe-repository.js', () => ({
  findRecipeById: findRecipeByIdMock,
}));

import {
  favoriteRecipe,
  listFavorites,
  unfavoriteRecipe,
} from './favorite-service.js';

const recipe = {
  id: 'recipe-1',
  name: 'Tomato Soup',
  description: null,
  instructions: 'Simmer.',
  cuisine: null,
  preparationTime: null,
  servings: null,
  imageUrl: null,
  sourceUrl: null,
  dietTags: [],
  allergens: [],
  isPublished: true,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  ingredients: [],
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('listFavorites', () => {
  it('delegates with the user ID and maps only public summary fields', async () => {
    findPublishedFavoriteRecipesMock.mockResolvedValue([recipe]);

    await expect(listFavorites('user-1')).resolves.toEqual([
      {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        cuisine: recipe.cuisine,
        preparationTime: recipe.preparationTime,
        servings: recipe.servings,
        imageUrl: recipe.imageUrl,
        dietTags: recipe.dietTags,
        allergens: recipe.allergens,
        isPublished: recipe.isPublished,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt,
      },
    ]);
    expect(findPublishedFavoriteRecipesMock).toHaveBeenCalledWith('user-1');
  });
});

describe('favoriteRecipe', () => {
  it('favorites a published recipe using the authenticated user ID', async () => {
    findRecipeByIdMock.mockResolvedValue(recipe);
    upsertFavoriteMock.mockResolvedValue(undefined);

    await favoriteRecipe('user-1', 'recipe-1');

    expect(upsertFavoriteMock).toHaveBeenCalledWith('user-1', 'recipe-1');
  });

  it('remains successful when the repository upsert finds an existing row', async () => {
    findRecipeByIdMock.mockResolvedValue(recipe);
    upsertFavoriteMock.mockResolvedValue(undefined);

    await expect(favoriteRecipe('user-1', 'recipe-1')).resolves.toBeUndefined();
  });

  it('returns the safe not-found error for a missing recipe', async () => {
    findRecipeByIdMock.mockResolvedValue(null);

    await expect(favoriteRecipe('user-1', 'missing')).rejects.toMatchObject({
      statusCode: 404,
      code: 'RECIPE_NOT_FOUND',
    });
    expect(upsertFavoriteMock).not.toHaveBeenCalled();
  });

  it('uses the same not-found error for an unpublished recipe', async () => {
    findRecipeByIdMock.mockResolvedValue({ ...recipe, isPublished: false });

    await expect(favoriteRecipe('user-1', 'recipe-1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'RECIPE_NOT_FOUND',
    });
    expect(upsertFavoriteMock).not.toHaveBeenCalled();
  });

  it('does not bypass publication rules for an admin user ID', async () => {
    findRecipeByIdMock.mockResolvedValue({ ...recipe, isPublished: false });

    await expect(favoriteRecipe('admin-1', 'recipe-1')).rejects.toMatchObject({
      code: 'RECIPE_NOT_FOUND',
    });
  });
});

describe('unfavoriteRecipe', () => {
  it('delegates a user-scoped removal', async () => {
    deleteFavoriteMock.mockResolvedValue(undefined);

    await unfavoriteRecipe('user-1', 'recipe-1');

    expect(deleteFavoriteMock).toHaveBeenCalledWith('user-1', 'recipe-1');
  });

  it('remains successful when no favorite row exists', async () => {
    deleteFavoriteMock.mockResolvedValue(undefined);

    await expect(
      unfavoriteRecipe('user-2', 'recipe-1'),
    ).resolves.toBeUndefined();
    expect(deleteFavoriteMock).toHaveBeenCalledWith('user-2', 'recipe-1');
  });
});
