import { apiRequest } from '../lib/api';
import type { CanonicalIngredientListResponse } from '../types/ingredient';

export const listCanonicalIngredients =
  (): Promise<CanonicalIngredientListResponse> =>
    apiRequest<CanonicalIngredientListResponse>('/admin/ingredients');
