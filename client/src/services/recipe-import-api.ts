import { apiRequest } from '../lib/api';
import type {
  RecipeImportRequest,
  RecipeImportResponse,
} from '../types/recipe-import';

export const importRecipes = (
  payload: RecipeImportRequest,
): Promise<RecipeImportResponse> =>
  apiRequest<RecipeImportResponse>('/admin/recipes/import', {
    method: 'POST',
    body: payload,
  });
