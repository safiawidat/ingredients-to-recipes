import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listIngredientsMock } = vi.hoisted(() => ({
  listIngredientsMock: vi.fn(),
}));

vi.mock('../repositories/ingredient-repository.js', () => ({
  listIngredients: listIngredientsMock,
}));

import { listCanonicalIngredients } from './ingredient-service.js';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('listCanonicalIngredients', () => {
  it('returns the canonical ingredient records from the repository', async () => {
    const ingredients = [{ id: 'ingredient-1', name: 'tomato' }];
    listIngredientsMock.mockResolvedValue(ingredients);

    await expect(listCanonicalIngredients()).resolves.toEqual(ingredients);
    expect(listIngredientsMock).toHaveBeenCalledOnce();
  });
});
