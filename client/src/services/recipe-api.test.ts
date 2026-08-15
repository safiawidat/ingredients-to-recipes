import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  apiRequest: apiRequestMock,
}));

import { getRecipe, listRecipes } from './recipe-api';

const recipeListResponse = {
  data: {
    recipes: [],
    pagination: {
      page: 2,
      pageSize: 5,
      total: 0,
      totalPages: 0,
    },
  },
};

const recipeResponse = {
  data: {
    recipe: {
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
      createdAt: '2026-07-28T00:00:00.000Z',
      updatedAt: '2026-07-28T00:00:00.000Z',
      ingredients: [],
      isFavorite: false,
    },
  },
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('recipe API service', () => {
  it('constructs the supported recipe list query and preserves the envelope', async () => {
    apiRequestMock.mockResolvedValue(recipeListResponse);

    await expect(listRecipes({ page: 2, pageSize: 5 })).resolves.toEqual(
      recipeListResponse,
    );
    expect(apiRequestMock).toHaveBeenCalledWith('/recipes?page=2&pageSize=5');
  });

  it('omits the query string when pagination is not supplied', async () => {
    apiRequestMock.mockResolvedValue(recipeListResponse);

    await listRecipes();

    expect(apiRequestMock).toHaveBeenCalledWith('/recipes');
  });

  it('loads recipe detail from the recipe path', async () => {
    apiRequestMock.mockResolvedValue(recipeResponse);

    await expect(getRecipe('recipe-1')).resolves.toEqual(recipeResponse);
    expect(apiRequestMock).toHaveBeenCalledWith('/recipes/recipe-1');
  });
});
