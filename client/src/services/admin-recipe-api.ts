import { apiRequest } from '../lib/api';
import type {
  CreateRecipeInput,
  RecipeListParams,
  RecipeListResponse,
  RecipeResponse,
  UpdateRecipeInput,
} from '../types/recipe';

export const listAdminRecipes = (
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

  return apiRequest<RecipeListResponse>(
    `/admin/recipes${query ? `?${query}` : ''}`,
  );
};

export const createRecipe = (
  input: CreateRecipeInput,
): Promise<RecipeResponse> =>
  apiRequest<RecipeResponse>('/admin/recipes', {
    method: 'POST',
    body: input,
  });

export const updateRecipe = (
  id: string,
  input: UpdateRecipeInput,
): Promise<RecipeResponse> =>
  apiRequest<RecipeResponse>(`/admin/recipes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  });
