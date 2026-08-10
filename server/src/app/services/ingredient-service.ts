import {
  listIngredients,
  type IngredientRecord,
} from '../repositories/ingredient-repository.js';

export const listCanonicalIngredients = (): Promise<IngredientRecord[]> =>
  listIngredients();
