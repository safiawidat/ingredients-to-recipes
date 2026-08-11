import { describe, expect, it } from 'vitest';

import {
  findKNearestRecipes,
  type RecommendationCandidate,
  type RecommendationIngredient,
} from './knn-recommendation-engine.js';

const ingredient = (
  id: string,
  name = id,
): RecommendationIngredient => ({ id, name });

const candidate = (
  id: string,
  name: string,
  ingredientIds: string[],
): RecommendationCandidate => ({
  recipe: {
    id,
    name,
    description: null,
    cuisine: null,
    preparationTime: null,
    servings: null,
    imageUrl: null,
    dietTags: [],
    allergens: [],
  },
  ingredients: ingredientIds.map((ingredientId) => ingredient(ingredientId)),
});

describe('findKNearestRecipes', () => {
  it('returns exact-match metrics and no missing ingredients', () => {
    const exact = candidate('recipe-exact', 'Exact Recipe', ['a', 'b', 'c']);

    const result = findKNearestRecipes({
      userIngredientIds: ['a', 'b', 'c'],
      candidates: [exact],
      limit: 5,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      recipe: exact.recipe,
      score: 1,
      distance: 0,
      matchPercentage: 100,
      missingIngredients: [],
    });
    expect(result[0]?.matchedIngredients.map(({ id }) => id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('does not reduce an exact score for extra user ingredients', () => {
    const result = findKNearestRecipes({
      userIngredientIds: ['a', 'b', 'extra-1', 'extra-2'],
      candidates: [candidate('recipe-1', 'Recipe', ['a', 'b'])],
      limit: 5,
    });

    expect(result[0]).toMatchObject({
      score: 1,
      distance: 0,
      matchPercentage: 100,
    });
  });

  it('ranks a recipe missing one ingredient below an exact match', () => {
    const result = findKNearestRecipes({
      userIngredientIds: ['a', 'b'],
      candidates: [
        candidate('recipe-partial', 'Partial', ['a', 'b', 'c']),
        candidate('recipe-exact', 'Exact', ['a', 'b']),
      ],
      limit: 5,
    });

    expect(result.map(({ recipe }) => recipe.id)).toEqual([
      'recipe-exact',
      'recipe-partial',
    ]);
    expect(result[1]?.score).toBeCloseTo(2 / 3);
    expect(result[1]?.missingIngredients.map(({ id }) => id)).toEqual(['c']);
  });

  it('excludes zero-overlap candidates', () => {
    const result = findKNearestRecipes({
      userIngredientIds: ['a'],
      candidates: [
        candidate('recipe-match', 'Match', ['a', 'b']),
        candidate('recipe-none', 'No Match', ['x', 'y']),
      ],
      limit: 5,
    });

    expect(result.map(({ recipe }) => recipe.id)).toEqual(['recipe-match']);
  });

  it('skips a zero-ingredient candidate without dividing by zero', () => {
    const result = findKNearestRecipes({
      userIngredientIds: ['a'],
      candidates: [candidate('recipe-empty', 'Empty', [])],
      limit: 5,
    });

    expect(result).toEqual([]);
  });

  it('treats duplicate user ingredient IDs as one ingredient', () => {
    const candidates = [candidate('recipe-1', 'Recipe', ['a', 'b', 'c'])];

    const uniqueResult = findKNearestRecipes({
      userIngredientIds: ['a', 'b'],
      candidates,
      limit: 5,
    });
    const duplicateResult = findKNearestRecipes({
      userIngredientIds: ['a', 'a', 'b', 'b'],
      candidates,
      limit: 5,
    });

    expect(duplicateResult).toEqual(uniqueResult);
  });

  it('returns only the requested top K recommendations', () => {
    const result = findKNearestRecipes({
      userIngredientIds: ['a', 'b'],
      candidates: [
        candidate('recipe-half', 'Half', ['a', 'x']),
        candidate('recipe-two-thirds', 'Two Thirds', ['a', 'b', 'x']),
        candidate('recipe-exact', 'Exact', ['a', 'b']),
      ],
      limit: 2,
    });

    expect(result.map(({ recipe }) => recipe.id)).toEqual([
      'recipe-exact',
      'recipe-two-thirds',
    ]);
  });

  it.each([0, -1, Number.NEGATIVE_INFINITY])(
    'returns an empty array when limit is %s',
    (limit) => {
      expect(
        findKNearestRecipes({
          userIngredientIds: ['a'],
          candidates: [candidate('recipe-1', 'Recipe', ['a'])],
          limit,
        }),
      ).toEqual([]);
    },
  );

  it('returns fewer than K when fewer candidates have positive overlap', () => {
    const result = findKNearestRecipes({
      userIngredientIds: ['a'],
      candidates: [
        candidate('recipe-match', 'Match', ['a']),
        candidate('recipe-none', 'No Match', ['x']),
      ],
      limit: 10,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.recipe.id).toBe('recipe-match');
  });

  it('sorts matched and missing ingredients by name and then ID', () => {
    const customCandidate: RecommendationCandidate = {
      ...candidate('recipe-1', 'Recipe', []),
      ingredients: [
        ingredient('banana-2', 'banana'),
        ingredient('carrot-2', 'carrot'),
        ingredient('banana-1', 'banana'),
        ingredient('apple-1', 'apple'),
        ingredient('carrot-1', 'carrot'),
      ],
    };

    const result = findKNearestRecipes({
      userIngredientIds: ['banana-2', 'banana-1', 'apple-1'],
      candidates: [customCandidate],
      limit: 5,
    });

    expect(result[0]?.matchedIngredients.map(({ id }) => id)).toEqual([
      'apple-1',
      'banana-1',
      'banana-2',
    ]);
    expect(result[0]?.missingIngredients.map(({ id }) => id)).toEqual([
      'carrot-1',
      'carrot-2',
    ]);
  });

  it('keeps score and distance bounded and complementary', () => {
    const result = findKNearestRecipes({
      userIngredientIds: ['a', 'b', 'c'],
      candidates: [
        candidate('recipe-exact', 'Exact', ['a', 'b']),
        candidate('recipe-partial', 'Partial', ['a', 'x', 'y']),
      ],
      limit: 5,
    });

    for (const recommendation of result) {
      expect(recommendation.score).toBeGreaterThanOrEqual(0);
      expect(recommendation.score).toBeLessThanOrEqual(1);
      expect(recommendation.distance).toBeGreaterThanOrEqual(0);
      expect(recommendation.distance).toBeLessThanOrEqual(1);
      expect(recommendation.score + recommendation.distance).toBeCloseTo(1);
    }
  });

  it('rounds match percentage without rounding the score', () => {
    const result = findKNearestRecipes({
      userIngredientIds: ['a', 'b', 'c', 'd', 'e'],
      candidates: [
        candidate('recipe-five-of-seven', 'Five of Seven', [
          'a',
          'b',
          'c',
          'd',
          'e',
          'x',
          'y',
        ]),
      ],
      limit: 5,
    });

    expect(result[0]?.score).toBeCloseTo(5 / 7);
    expect(result[0]?.score).not.toBe(0.71);
    expect(result[0]?.matchPercentage).toBe(71);
  });

  it('ranks a fully covered simple recipe above a partially covered complex one', () => {
    const result = findKNearestRecipes({
      userIngredientIds: ['a', 'b', 'c'],
      candidates: [
        candidate('recipe-complex', 'Complex', ['a', 'b', 'c', 'd', 'e']),
        candidate('recipe-simple', 'Simple', ['a', 'b']),
      ],
      limit: 5,
    });

    expect(result.map(({ recipe }) => recipe.id)).toEqual([
      'recipe-simple',
      'recipe-complex',
    ]);
  });

  it('prefers more matched ingredients among fully covered recipes', () => {
    const result = findKNearestRecipes({
      userIngredientIds: ['a', 'b', 'c', 'd'],
      candidates: [
        candidate('recipe-subset', 'Subset', ['a', 'b']),
        candidate('recipe-full', 'Full', ['a', 'b', 'c', 'd']),
      ],
      limit: 5,
    });

    expect(result.map(({ recipe }) => recipe.id)).toEqual([
      'recipe-full',
      'recipe-subset',
    ]);
  });

  it('prefers fewer missing ingredients when coverage scores are equal', () => {
    const result = findKNearestRecipes({
      userIngredientIds: ['a', 'b'],
      candidates: [
        candidate('recipe-two-missing', 'Two Missing', ['a', 'b', 'x', 'y']),
        candidate('recipe-one-missing', 'One Missing', ['a', 'x']),
      ],
      limit: 5,
    });

    expect(result.map(({ recipe }) => recipe.id)).toEqual([
      'recipe-one-missing',
      'recipe-two-missing',
    ]);
    expect(result.every(({ score }) => score === 0.5)).toBe(true);
  });

  it('uses recipe name ascending after recommendation metrics tie', () => {
    const result = findKNearestRecipes({
      userIngredientIds: ['a'],
      candidates: [
        candidate('recipe-z', 'Zulu', ['a', 'x']),
        candidate('recipe-a', 'Alpha', ['a', 'y']),
      ],
      limit: 5,
    });

    expect(result.map(({ recipe }) => recipe.name)).toEqual(['Alpha', 'Zulu']);
  });

  it('uses recipe ID ascending when metrics and names tie', () => {
    const result = findKNearestRecipes({
      userIngredientIds: ['a'],
      candidates: [
        candidate('recipe-b', 'Same Name', ['a', 'x']),
        candidate('recipe-a', 'Same Name', ['a', 'y']),
      ],
      limit: 5,
    });

    expect(result.map(({ recipe }) => recipe.id)).toEqual([
      'recipe-a',
      'recipe-b',
    ]);
  });

  it('does not mutate user IDs, candidates, recipes, or ingredient arrays', () => {
    const userIngredientIds = ['b', 'a', 'a'];
    const candidates = [
      candidate('recipe-b', 'Beta', ['c', 'a', 'b']),
      candidate('recipe-a', 'Alpha', ['b', 'a']),
    ];
    const originalUserIngredientIds = [...userIngredientIds];
    const originalCandidates = structuredClone(candidates);

    const result = findKNearestRecipes({
      userIngredientIds,
      candidates,
      limit: 5,
    });

    expect(userIngredientIds).toEqual(originalUserIngredientIds);
    expect(candidates).toEqual(originalCandidates);
    expect(result).not.toBe(candidates);
    expect(result[0]?.matchedIngredients).not.toBe(candidates[1]?.ingredients);
  });

  it('returns an empty array for an empty user ingredient set', () => {
    expect(
      findKNearestRecipes({
        userIngredientIds: [],
        candidates: [candidate('recipe-1', 'Recipe', ['a'])],
        limit: 5,
      }),
    ).toEqual([]);
  });

  it('returns the same deterministic ordering on repeated invocation', () => {
    const input = {
      userIngredientIds: ['a', 'b', 'c'],
      candidates: [
        candidate('recipe-c', 'Same', ['a', 'x']),
        candidate('recipe-b', 'Beta', ['a', 'b', 'x']),
        candidate('recipe-a', 'Same', ['a', 'y']),
      ],
      limit: 10,
    };

    const firstResult = findKNearestRecipes(input);
    const secondResult = findKNearestRecipes(input);

    expect(secondResult).toEqual(firstResult);
  });
});
