import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import {
  seedAliases,
  seedIngredients,
  seedRecipes,
  type SeedRecipe,
} from '../prisma/seed-data.js';
import type {
  RecommendationCandidate,
  RecommendationIngredient,
} from '../src/app/services/knn-recommendation-engine.js';
import { normalizeIngredientInput } from '../src/app/utils/ingredient-normalization.js';
import {
  recipeImportRequestSchema,
  type RecipeImportRecipe,
} from '../src/app/validation/recipe-import-schemas.js';

export const EXPECTED_SEED_RECIPE_COUNT = 30;
export const EXPECTED_GENERATED_RECIPE_COUNT = 470;
export const EXPECTED_TOTAL_RECIPE_COUNT = 500;
export const EXPECTED_PUBLISHED_RECIPE_COUNT = 487;
export const EXPECTED_UNPUBLISHED_RECIPE_COUNT = 13;

export interface EvaluationRecipeRecord {
  candidate: RecommendationCandidate;
  isPublished: boolean;
  source: 'seed' | 'generated';
  sourceIndex: number;
}

export interface EvaluationDataset {
  seed: EvaluationRecipeRecord[];
  generated: EvaluationRecipeRecord[];
  all: EvaluationRecipeRecord[];
  published: EvaluationRecipeRecord[];
  unpublished: EvaluationRecipeRecord[];
}

export interface UserIngredientResolution {
  recognizedIngredients: RecommendationIngredient[];
  unknownIngredients: string[];
}

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const controlledBatchPaths = [
  join(repositoryRoot, 'sample-data', 'controlled-recipes-batch-01.json'),
  join(repositoryRoot, 'sample-data', 'controlled-recipes-batch-02.json'),
] as const;

const canonicalByNormalizedName = new Map(
  seedIngredients.map((name) => [normalizeIngredientInput(name), name]),
);
const canonicalByNormalizedAlias = new Map(
  seedAliases.map(({ alias, ingredient }) => [
    normalizeIngredientInput(alias),
    ingredient,
  ]),
);

export const resolveCanonicalIngredient = (
  term: string,
): RecommendationIngredient | null => {
  const normalizedTerm = normalizeIngredientInput(term);
  const canonicalName =
    canonicalByNormalizedName.get(normalizedTerm) ??
    canonicalByNormalizedAlias.get(normalizedTerm) ??
    null;

  return canonicalName === null
    ? null
    : { id: canonicalName, name: canonicalName };
};

export const resolveRecipeIngredientTerms = (
  terms: readonly string[],
): RecommendationIngredient[] => {
  const resolved: RecommendationIngredient[] = [];
  const seenCanonicalIds = new Set<string>();

  for (const term of terms) {
    const ingredient = resolveCanonicalIngredient(term);
    if (!ingredient) {
      throw new Error(`Unknown controlled ingredient term: ${term}`);
    }
    if (seenCanonicalIds.has(ingredient.id)) {
      throw new Error(
        `Duplicate canonical ingredient in adapted recipe: ${ingredient.name}`,
      );
    }

    seenCanonicalIds.add(ingredient.id);
    resolved.push(ingredient);
  }

  return resolved;
};

export const resolveUserIngredientTerms = (
  terms: readonly string[],
): UserIngredientResolution => {
  const recognizedIngredients: RecommendationIngredient[] = [];
  const unknownIngredients: string[] = [];
  const seenCanonicalIds = new Set<string>();
  const seenNormalizedTerms = new Set<string>();

  for (const term of terms) {
    const normalizedTerm = normalizeIngredientInput(term);
    if (normalizedTerm.length === 0 || seenNormalizedTerms.has(normalizedTerm)) {
      continue;
    }
    seenNormalizedTerms.add(normalizedTerm);

    const ingredient = resolveCanonicalIngredient(normalizedTerm);
    if (!ingredient) {
      unknownIngredients.push(normalizedTerm);
      continue;
    }
    if (!seenCanonicalIds.has(ingredient.id)) {
      seenCanonicalIds.add(ingredient.id);
      recognizedIngredients.push(ingredient);
    }
  }

  return { recognizedIngredients, unknownIngredients };
};

type AdaptableRecipe = SeedRecipe | RecipeImportRecipe;

const ingredientTerms = (recipe: AdaptableRecipe): string[] =>
  recipe.ingredients.map((ingredient) =>
    'ingredient' in ingredient ? ingredient.ingredient : ingredient.name,
  );

const adaptRecipe = (
  id: string,
  recipe: AdaptableRecipe,
  source: EvaluationRecipeRecord['source'],
  sourceIndex: number,
): EvaluationRecipeRecord => ({
  candidate: {
    recipe: {
      id,
      name: recipe.name,
      description: recipe.description,
      cuisine: recipe.cuisine,
      preparationTime: recipe.preparationTime,
      servings: recipe.servings,
      imageUrl: recipe.imageUrl,
      dietTags: recipe.dietTags,
      allergens: recipe.allergens,
    },
    ingredients: resolveRecipeIngredientTerms(ingredientTerms(recipe)),
  },
  isPublished: recipe.isPublished,
  source,
  sourceIndex,
});

const loadGeneratedRecipes = (): RecipeImportRecipe[] =>
  controlledBatchPaths.flatMap((path) => {
    const parsedJson: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return recipeImportRequestSchema.parse(parsedJson).recipes;
  });

const assertCount = (label: string, actual: number, expected: number): void => {
  if (actual !== expected) {
    throw new Error(`Expected ${expected} ${label}, received ${actual}`);
  }
};

export const loadEvaluationDataset = (): EvaluationDataset => {
  const seed = seedRecipes.map((recipe, sourceIndex) =>
    adaptRecipe(recipe.id, recipe, 'seed', sourceIndex),
  );
  const generated = loadGeneratedRecipes().map((recipe, sourceIndex) =>
    adaptRecipe(
      `controlled-recipe-${String(sourceIndex + 1).padStart(3, '0')}`,
      recipe,
      'generated',
      sourceIndex,
    ),
  );
  const all = [...seed, ...generated];
  const published = all.filter(({ isPublished }) => isPublished);
  const unpublished = all.filter(({ isPublished }) => !isPublished);

  assertCount('seed recipes', seed.length, EXPECTED_SEED_RECIPE_COUNT);
  assertCount(
    'generated recipes',
    generated.length,
    EXPECTED_GENERATED_RECIPE_COUNT,
  );
  assertCount('total recipes', all.length, EXPECTED_TOTAL_RECIPE_COUNT);
  assertCount(
    'published recipes',
    published.length,
    EXPECTED_PUBLISHED_RECIPE_COUNT,
  );
  assertCount(
    'unpublished recipes',
    unpublished.length,
    EXPECTED_UNPUBLISHED_RECIPE_COUNT,
  );

  return { seed, generated, all, published, unpublished };
};

const compareText = (left: string, right: string): number => {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

export const sortRecordsByRecipeNameAndId = (
  records: readonly EvaluationRecipeRecord[],
): EvaluationRecipeRecord[] =>
  [...records].sort(
    (left, right) =>
      compareText(left.candidate.recipe.name, right.candidate.recipe.name) ||
      compareText(left.candidate.recipe.id, right.candidate.recipe.id),
  );

export const toCandidates = (
  records: readonly EvaluationRecipeRecord[],
): RecommendationCandidate[] => records.map(({ candidate }) => candidate);
