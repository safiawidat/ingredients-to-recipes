import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  apiRequest: apiRequestMock,
}));

import { listCanonicalIngredients } from './ingredient-api';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('canonical ingredient API service', () => {
  it('returns canonical id and name references in the response envelope', async () => {
    const response = {
      data: {
        ingredients: [
          { id: 'ingredient-1', name: 'apple' },
          { id: 'ingredient-2', name: 'tomato' },
        ],
      },
    };
    apiRequestMock.mockResolvedValue(response);

    await expect(listCanonicalIngredients()).resolves.toEqual(response);
    expect(apiRequestMock).toHaveBeenCalledWith('/admin/ingredients');
  });
});
