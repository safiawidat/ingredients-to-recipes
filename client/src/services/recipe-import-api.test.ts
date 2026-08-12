import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../lib/api';
import type { RecipeImportRequest } from '../types/recipe-import';

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock('../lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/api')>();
  return { ...original, apiRequest: apiRequestMock };
});

import { importRecipes } from './recipe-import-api';

const payload: RecipeImportRequest = {
  recipes: [
    {
      name: 'Tomato Soup',
      description: null,
      instructions: 'Cook it.',
      cuisine: null,
      preparationTime: null,
      servings: null,
      imageUrl: null,
      sourceUrl: null,
      dietTags: [],
      allergens: [],
      isPublished: true,
      ingredients: [
        { name: 'tomato', quantity: null, unit: null, category: 'MAIN' },
      ],
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('importRecipes', () => {
  it('posts the exact payload and returns the response unchanged', async () => {
    const response = {
      data: {
        received: 1,
        imported: 1,
        skippedDuplicates: 0,
        duplicates: [],
      },
    };
    apiRequestMock.mockResolvedValue(response);

    await expect(importRecipes(payload)).resolves.toBe(response);
    expect(apiRequestMock).toHaveBeenCalledWith('/admin/recipes/import', {
      method: 'POST',
      body: payload,
    });
  });

  it('propagates ApiError unchanged', async () => {
    const error = new ApiError(422, 'UNKNOWN_INGREDIENTS', 'Unknown', {
      unknownIngredients: ['dragon fruit'],
    });
    apiRequestMock.mockRejectedValue(error);

    await expect(importRecipes(payload)).rejects.toBe(error);
  });
});
