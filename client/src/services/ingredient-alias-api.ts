import { apiRequest } from '../lib/api';
import type {
  CreateIngredientAliasInput,
  IngredientAliasListResponse,
  IngredientAliasResponse,
  UpdateIngredientAliasInput,
} from '../types/ingredient';

const aliasPath = '/admin/ingredient-aliases';

export const listIngredientAliases = (): Promise<IngredientAliasListResponse> =>
  apiRequest<IngredientAliasListResponse>(aliasPath);

export const createIngredientAlias = (
  input: CreateIngredientAliasInput,
): Promise<IngredientAliasResponse> =>
  apiRequest<IngredientAliasResponse>(aliasPath, {
    method: 'POST',
    body: input,
  });

export const updateIngredientAlias = (
  id: string,
  input: UpdateIngredientAliasInput,
): Promise<IngredientAliasResponse> =>
  apiRequest<IngredientAliasResponse>(
    `${aliasPath}/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: input,
    },
  );

export const deleteIngredientAlias = (id: string): Promise<void> =>
  apiRequest<void>(`${aliasPath}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
