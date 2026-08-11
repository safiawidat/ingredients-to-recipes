import { apiRequest } from '../lib/api';
import type { FavoritesResponse } from '../types/favorite';

export const getFavorites = (): Promise<FavoritesResponse> =>
  apiRequest<FavoritesResponse>('/favorites');

export const favoriteRecipe = (recipeId: string): Promise<void> =>
  apiRequest<void>(`/favorites/${encodeURIComponent(recipeId)}`, {
    method: 'PUT',
  });

export const unfavoriteRecipe = (recipeId: string): Promise<void> =>
  apiRequest<void>(`/favorites/${encodeURIComponent(recipeId)}`, {
    method: 'DELETE',
  });
