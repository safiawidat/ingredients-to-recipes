import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateRecipeInput, UpdateRecipeInput } from '../types/recipe';

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  apiRequest: apiRequestMock,
}));

import {
  createRecipe,
  listAdminRecipes,
  updateRecipe,
} from './admin-recipe-api';

const response = {
  data: {
    recipe: {
      id: 'recipe-1',
      name: 'Tomato Soup',
    },
  },
};

const listResponse = {
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

beforeEach(() => {
  vi.resetAllMocks();
});

describe('admin recipe API service', () => {
  it('lists admin recipes with the supported pagination query', async () => {
    apiRequestMock.mockResolvedValue(listResponse);

    await expect(
      listAdminRecipes({ page: 2, pageSize: 5 }),
    ).resolves.toEqual(listResponse);
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/admin/recipes?page=2&pageSize=5',
    );
  });

  it('omits the query string when pagination is not supplied', async () => {
    apiRequestMock.mockResolvedValue(listResponse);

    await expect(listAdminRecipes()).resolves.toEqual(listResponse);
    expect(apiRequestMock).toHaveBeenCalledWith('/admin/recipes');
  });

  it('omits individual undefined pagination parameters', async () => {
    apiRequestMock.mockResolvedValue(listResponse);

    await listAdminRecipes({ page: 2, pageSize: undefined });

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/recipes?page=2');
  });

  it('creates a recipe with the expected method, body, and path', async () => {
    apiRequestMock.mockResolvedValue(response);
    const input: CreateRecipeInput = {
      name: 'Tomato Soup',
      instructions: 'Simmer everything.',
      ingredients: [{ ingredientId: 'ingredient-1' }],
    };

    await expect(createRecipe(input)).resolves.toEqual(response);
    expect(apiRequestMock).toHaveBeenCalledWith('/admin/recipes', {
      method: 'POST',
      body: input,
    });
  });

  it('updates a recipe with the expected method, body, and path', async () => {
    apiRequestMock.mockResolvedValue(response);
    const input: UpdateRecipeInput = { description: null };

    await expect(updateRecipe('recipe-1', input)).resolves.toEqual(response);
    expect(apiRequestMock).toHaveBeenCalledWith('/admin/recipes/recipe-1', {
      method: 'PATCH',
      body: input,
    });
  });
});
