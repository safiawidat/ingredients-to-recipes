import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../lib/api';

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock('../lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/api')>();

  return {
    ...original,
    apiRequest: apiRequestMock,
  };
});

import { recommendRecipes } from './recommendation-api';

const input = {
  ingredients: ['tomato', 'onion'],
  limit: 10,
};

const response = {
  data: {
    recognizedIngredients: [{ id: 'ingredient-1', name: 'tomato' }],
    unknownIngredients: ['onion'],
    recommendations: [],
  },
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('recommendation API service', () => {
  it('posts the exact request body to the recommendation path', async () => {
    apiRequestMock.mockResolvedValue(response);

    await recommendRecipes(input);

    expect(apiRequestMock).toHaveBeenCalledWith('/recommendations', {
      method: 'POST',
      body: input,
    });
  });

  it('posts an exact filtered request body unchanged', async () => {
    apiRequestMock.mockResolvedValue(response);
    const filteredInput = {
      ...input,
      filters: {
        cuisine: 'Mediterranean-inspired' as const,
        maxPreparationTime: 30,
        dietaryType: 'vegan' as const,
        excludeAllergens: ['peanut', 'soy'] as const,
      },
    };

    await recommendRecipes({
      ...filteredInput,
      filters: {
        ...filteredInput.filters,
        excludeAllergens: [...filteredInput.filters.excludeAllergens],
      },
    });

    expect(apiRequestMock).toHaveBeenCalledWith('/recommendations', {
      method: 'POST',
      body: {
        ...filteredInput,
        filters: {
          ...filteredInput.filters,
          excludeAllergens: ['peanut', 'soy'],
        },
      },
    });
  });

  it('returns the backend response envelope unchanged', async () => {
    apiRequestMock.mockResolvedValue(response);

    await expect(recommendRecipes(input)).resolves.toBe(response);
  });

  it('propagates ApiError without rewriting it', async () => {
    const error = new ApiError(
      400,
      'NO_RECOGNIZED_INGREDIENTS',
      'At least one ingredient must match a known ingredient',
    );
    apiRequestMock.mockRejectedValue(error);

    await expect(recommendRecipes(input)).rejects.toBe(error);
  });
});
