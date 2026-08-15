import { ApplicationError } from '../errors/application-error.js';
import {
  findPublishedRecipesWithIngredients,
  type PublishedRecipeWithIngredients,
} from '../repositories/recipe-repository.js';
import { createRecommendationHistory } from '../repositories/recommendation-history-repository.js';
import { normalizeIngredientInputs } from '../utils/ingredient-normalization.js';
import { findIngredientsByNormalizedValues } from './ingredient-lookup-service.js';
import type { RecommendationFilters } from '../validation/recommendation-schemas.js';
import {
  findKNearestRecipes,
  type RecommendationCandidate,
  type RecommendationIngredient,
  type RecommendationResult,
} from './knn-recommendation-engine.js';

export interface RecommendationServiceInput {
  ingredients: string[];
  limit: number;
  filters?: RecommendationFilters | undefined;
}

export interface RecommendationServiceResult {
  recognizedIngredients: RecommendationIngredient[];
  unknownIngredients: string[];
  recommendations: RecommendationResult[];
}

const EMPTY_INGREDIENT_INPUT_MESSAGE =
  'At least one non-empty ingredient is required';

const noRecognizedIngredientsError = (): ApplicationError =>
  new ApplicationError(
    400,
    'NO_RECOGNIZED_INGREDIENTS',
    'At least one ingredient must match a known ingredient',
  );

const normalizeInputs = (ingredients: string[]): string[] => {
  try {
    return normalizeIngredientInputs(ingredients);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === EMPTY_INGREDIENT_INPUT_MESSAGE
    ) {
      throw noRecognizedIngredientsError();
    }

    throw error;
  }
};

const toRecommendationCandidate = (
  candidate: PublishedRecipeWithIngredients,
): RecommendationCandidate => ({
  recipe: {
    id: candidate.id,
    name: candidate.name,
    description: candidate.description,
    cuisine: candidate.cuisine,
    preparationTime: candidate.preparationTime,
    servings: candidate.servings,
    imageUrl: candidate.imageUrl,
    dietTags: candidate.dietTags,
    allergens: candidate.allergens,
  },
  ingredients: candidate.ingredients.map(({ ingredient }) => ({
    id: ingredient.id,
    name: ingredient.name,
  })),
});

export const recommendRecipes = async (
  userId: string,
  input: RecommendationServiceInput,
): Promise<RecommendationServiceResult> => {
  const normalizedInputs = normalizeInputs(input.ingredients);
  const lookupResults =
    await findIngredientsByNormalizedValues(normalizedInputs);
  const recognizedIngredients: RecommendationIngredient[] = [];
  const unknownIngredients: string[] = [];
  const recognizedIngredientIds = new Set<string>();

  for (const normalizedInput of normalizedInputs) {
    const ingredient = lookupResults.get(normalizedInput) ?? null;

    if (!ingredient) {
      unknownIngredients.push(normalizedInput);
      continue;
    }

    if (!recognizedIngredientIds.has(ingredient.id)) {
      recognizedIngredientIds.add(ingredient.id);
      recognizedIngredients.push(ingredient);
    }
  }

  if (recognizedIngredients.length === 0) {
    throw noRecognizedIngredientsError();
  }

  const repositoryCandidates =
    input.filters === undefined
      ? await findPublishedRecipesWithIngredients()
      : await findPublishedRecipesWithIngredients(input.filters);
  const candidates = repositoryCandidates.map(toRecommendationCandidate);
  const recommendations = findKNearestRecipes({
    userIngredientIds: recognizedIngredientIds,
    candidates,
    limit: input.limit,
  });

  await createRecommendationHistory({
    userId,
    inputIngredients: normalizedInputs,
    filters: {
      limit: input.limit,
      ...input.filters,
    },
    results: {
      recognizedIngredients: recognizedIngredients.map(
        (ingredient) => ingredient.name,
      ),
      unknownIngredients,
      recipeIds: recommendations.map(({ recipe }) => recipe.id),
    },
  });

  return {
    recognizedIngredients,
    unknownIngredients,
    recommendations,
  };
};
