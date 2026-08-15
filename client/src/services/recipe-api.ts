import { apiRequest } from '../lib/api';
import type {
  RecipeListParams,
  RecipeListResponse,
  AuthenticatedRecipeResponse,
} from '../types/recipe';

export const listRecipes = (
  params: RecipeListParams = {},
): Promise<RecipeListResponse> => {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) {
    searchParams.set('page', String(params.page));
  }
  if (params.pageSize !== undefined) {
    searchParams.set('pageSize', String(params.pageSize));
  }

  const query = searchParams.toString();

  return apiRequest<RecipeListResponse>(`/recipes${query ? `?${query}` : ''}`);
};

export const getRecipe = (
  id: string,
): Promise<AuthenticatedRecipeResponse> =>
  apiRequest<AuthenticatedRecipeResponse>(
    `/recipes/${encodeURIComponent(id)}`,
  );
