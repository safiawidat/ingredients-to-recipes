import { normalizeIngredientInputs } from '../utils/ingredient-normalization.js';
import { findIngredientsByNormalizedValues } from './ingredient-lookup-service.js';

export type IngredientResolutionStatus = 'canonical' | 'alias' | 'unresolved';

export interface IngredientResolution {
  normalizedInput: string;
  status: IngredientResolutionStatus;
  ingredientId: string | null;
  canonicalName: string | null;
}

export const normalizeAndResolveIngredients = async (
  rawIngredients: string[],
): Promise<IngredientResolution[]> => {
  const normalizedIngredients = normalizeIngredientInputs(rawIngredients);
  const lookupResults = await findIngredientsByNormalizedValues(
    normalizedIngredients,
  );

  return normalizedIngredients.map((normalizedInput) => {
    const match = lookupResults.get(normalizedInput) ?? null;

    if (!match) {
      return {
        normalizedInput,
        status: 'unresolved',
        ingredientId: null,
        canonicalName: null,
      };
    }

    return {
      normalizedInput,
      status: match.name === normalizedInput ? 'canonical' : 'alias',
      ingredientId: match.id,
      canonicalName: match.name,
    };
  });
};
