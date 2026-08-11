import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../lib/api';

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  apiRequest: apiRequestMock,
}));

import {
  favoriteRecipe,
  getFavorites,
  unfavoriteRecipe,
} from './favorite-api';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('favorite API service', () => {
  it('gets favorites from the collection path', async () => {
    const response = { data: { recipes: [] } };
    apiRequestMock.mockResolvedValue(response);

    await expect(getFavorites()).resolves.toEqual(response);
    expect(apiRequestMock).toHaveBeenCalledWith('/favorites');
  });

  it('favorites an encoded recipe ID with PUT and handles 204', async () => {
    apiRequestMock.mockResolvedValue(undefined);

    await expect(favoriteRecipe('recipe/one two')).resolves.toBeUndefined();
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/favorites/recipe%2Fone%20two',
      { method: 'PUT' },
    );
  });

  it('unfavorites an encoded recipe ID with DELETE and handles 204', async () => {
    apiRequestMock.mockResolvedValue(undefined);

    await expect(unfavoriteRecipe('recipe/one two')).resolves.toBeUndefined();
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/favorites/recipe%2Fone%20two',
      { method: 'DELETE' },
    );
  });

  it('propagates ApiError unchanged', async () => {
    const error = new ApiError(500, 'INTERNAL_SERVER_ERROR', 'safe message');
    apiRequestMock.mockRejectedValue(error);

    await expect(getFavorites()).rejects.toBe(error);
  });
});
