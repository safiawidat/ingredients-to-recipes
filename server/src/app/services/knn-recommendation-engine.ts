export interface RecommendationIngredient {
  id: string;
  name: string;
}

export interface RecommendationRecipe {
  id: string;
  name: string;
  description: string | null;
  cuisine: string | null;
  preparationTime: number | null;
  servings: number | null;
  imageUrl: string | null;
  dietTags: readonly string[];
  allergens: readonly string[];
}

export interface RecommendationCandidate {
  recipe: RecommendationRecipe;
  ingredients: readonly RecommendationIngredient[];
}

export interface RecommendationResult {
  recipe: RecommendationRecipe;
  score: number;
  distance: number;
  matchPercentage: number;
  matchedIngredients: RecommendationIngredient[];
  missingIngredients: RecommendationIngredient[];
}

export interface FindKNearestRecipesInput {
  userIngredientIds: Iterable<string>;
  candidates: readonly RecommendationCandidate[];
  limit: number;
}

interface ScoredCandidate {
  result: RecommendationResult;
  matchedCount: number;
  totalIngredientCount: number;
}

const compareText = (left: string, right: string): number => {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
};

const compareIngredients = (
  left: RecommendationIngredient,
  right: RecommendationIngredient,
): number => compareText(left.name, right.name) || compareText(left.id, right.id);

const uniqueIngredientsById = (
  ingredients: readonly RecommendationIngredient[],
): RecommendationIngredient[] => {
  const ingredientsById = new Map<string, RecommendationIngredient>();

  for (const ingredient of ingredients) {
    if (!ingredientsById.has(ingredient.id)) {
      ingredientsById.set(ingredient.id, ingredient);
    }
  }

  return [...ingredientsById.values()];
};

const compareScoredCandidates = (
  left: ScoredCandidate,
  right: ScoredCandidate,
): number => {
  const leftCoverageNumerator =
    left.matchedCount * right.totalIngredientCount;
  const rightCoverageNumerator =
    right.matchedCount * left.totalIngredientCount;

  if (leftCoverageNumerator !== rightCoverageNumerator) {
    return rightCoverageNumerator - leftCoverageNumerator;
  }

  const missingDifference =
    left.result.missingIngredients.length -
    right.result.missingIngredients.length;
  if (missingDifference !== 0) {
    return missingDifference;
  }

  if (left.matchedCount !== right.matchedCount) {
    return right.matchedCount - left.matchedCount;
  }

  return (
    compareText(left.result.recipe.name, right.result.recipe.name) ||
    compareText(left.result.recipe.id, right.result.recipe.id)
  );
};

export const findKNearestRecipes = ({
  userIngredientIds,
  candidates,
  limit,
}: FindKNearestRecipesInput): RecommendationResult[] => {
  if (limit <= 0) {
    return [];
  }

  const userIngredientSet = new Set(userIngredientIds);
  if (userIngredientSet.size === 0) {
    return [];
  }

  const scoredCandidates: ScoredCandidate[] = [];

  for (const candidate of candidates) {
    const recipeIngredients = uniqueIngredientsById(candidate.ingredients);
    if (recipeIngredients.length === 0) {
      continue;
    }

    const matchedIngredients: RecommendationIngredient[] = [];
    const missingIngredients: RecommendationIngredient[] = [];

    for (const ingredient of recipeIngredients) {
      if (userIngredientSet.has(ingredient.id)) {
        matchedIngredients.push(ingredient);
      } else {
        missingIngredients.push(ingredient);
      }
    }

    if (matchedIngredients.length === 0) {
      continue;
    }

    matchedIngredients.sort(compareIngredients);
    missingIngredients.sort(compareIngredients);

    const score = matchedIngredients.length / recipeIngredients.length;

    scoredCandidates.push({
      result: {
        recipe: candidate.recipe,
        score,
        distance: 1 - score,
        matchPercentage: Math.round(score * 100),
        matchedIngredients,
        missingIngredients,
      },
      matchedCount: matchedIngredients.length,
      totalIngredientCount: recipeIngredients.length,
    });
  }

  const safeLimit = Number.isFinite(limit) ? Math.floor(limit) : limit;

  return scoredCandidates
    .sort(compareScoredCandidates)
    .slice(0, safeLimit)
    .map(({ result }) => result);
};
