import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  apiRequest: apiRequestMock,
}));

import {
  createIngredientAlias,
  deleteIngredientAlias,
  listIngredientAliases,
  updateIngredientAlias,
} from './ingredient-alias-api';

const alias = {
  id: 'alias-1',
  alias: 'love apple',
  ingredientId: 'ingredient-1',
  createdAt: '2026-07-28T00:00:00.000Z',
  ingredient: {
    id: 'ingredient-1',
    name: 'tomato',
  },
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('ingredient alias API service', () => {
  it('lists aliases and preserves their canonical ingredient references', async () => {
    const response = { data: { aliases: [alias] } };
    apiRequestMock.mockResolvedValue(response);

    await expect(listIngredientAliases()).resolves.toEqual(response);
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/admin/ingredient-aliases',
    );
  });

  it('creates an ingredient alias', async () => {
    const response = { data: { alias } };
    const input = { alias: 'love apple', ingredientId: 'ingredient-1' };
    apiRequestMock.mockResolvedValue(response);

    await expect(createIngredientAlias(input)).resolves.toEqual(response);
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/admin/ingredient-aliases',
      { method: 'POST', body: input },
    );
  });

  it('updates an ingredient alias', async () => {
    const response = { data: { alias } };
    const input = { ingredientId: 'ingredient-2' };
    apiRequestMock.mockResolvedValue(response);

    await expect(updateIngredientAlias('alias-1', input)).resolves.toEqual(
      response,
    );
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/admin/ingredient-aliases/alias-1',
      { method: 'PATCH', body: input },
    );
  });

  it('handles the alias delete 204 result', async () => {
    apiRequestMock.mockResolvedValue(undefined);

    await expect(deleteIngredientAlias('alias-1')).resolves.toBeUndefined();
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/admin/ingredient-aliases/alias-1',
      { method: 'DELETE' },
    );
  });
});
