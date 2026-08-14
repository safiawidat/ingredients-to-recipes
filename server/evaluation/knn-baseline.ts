import type {
  RecommendationCandidate,
  RecommendationIngredient,
  RecommendationRecipe,
} from '../src/app/services/knn-recommendation-engine.js';

export interface BaselineResult {
  recipe: RecommendationRecipe;
  matchedCount: number;
  missingCount: number;
  coverage: number;
  matchedIngredients: RecommendationIngredient[];
  missingIngredients: RecommendationIngredient[];
}

export interface FindMatchedCountBaselineInput {
  userIngredientIds: Iterable<string>;
  candidates: readonly RecommendationCandidate[];
  limit: number;
}

const compareText = (left: string, right: string): number => {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

const compareIngredients = (
  left: RecommendationIngredient,
  right: RecommendationIngredient,
): number => compareText(left.name, right.name) || compareText(left.id, right.id);

const uniqueIngredientsById = (
  ingredients: readonly RecommendationIngredient[],
): RecommendationIngredient[] => {
  const unique = new Map<string, RecommendationIngredient>();
  for (const ingredient of ingredients) {
    if (!unique.has(ingredient.id)) unique.set(ingredient.id, ingredient);
  }
  return [...unique.values()];
};

export const findMatchedCountBaseline = ({
  userIngredientIds,
  candidates,
  limit,
}: FindMatchedCountBaselineInput): BaselineResult[] => {
  if (limit <= 0) return [];

  const userIngredientSet = new Set(userIngredientIds);
  if (userIngredientSet.size === 0) return [];

  const results: BaselineResult[] = [];
  for (const candidate of candidates) {
    const recipeIngredients = uniqueIngredientsById(candidate.ingredients);
    if (recipeIngredients.length === 0) continue;

    const matchedIngredients: RecommendationIngredient[] = [];
    const missingIngredients: RecommendationIngredient[] = [];
    for (const ingredient of recipeIngredients) {
      if (userIngredientSet.has(ingredient.id)) {
        matchedIngredients.push(ingredient);
      } else {
        missingIngredients.push(ingredient);
      }
    }
    if (matchedIngredients.length === 0) continue;

    matchedIngredients.sort(compareIngredients);
    missingIngredients.sort(compareIngredients);
    results.push({
      recipe: candidate.recipe,
      matchedCount: matchedIngredients.length,
      missingCount: missingIngredients.length,
      coverage: matchedIngredients.length / recipeIngredients.length,
      matchedIngredients,
      missingIngredients,
    });
  }

  const safeLimit = Number.isFinite(limit) ? Math.floor(limit) : limit;
  return results
    .sort(
      (left, right) =>
        right.matchedCount - left.matchedCount ||
        compareText(left.recipe.name, right.recipe.name) ||
        compareText(left.recipe.id, right.recipe.id),
    )
    .slice(0, safeLimit);
};
