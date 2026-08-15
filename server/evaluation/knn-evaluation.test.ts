import { describe, expect, it } from 'vitest';

import type { RecommendationCandidate } from '../src/app/services/knn-recommendation-engine.js';
import { findMatchedCountBaseline } from './knn-baseline.js';
import {
  AGGREGATE_CASE_COUNT,
  CURATED_SCENARIO_COUNT,
  average,
  calculateBaselineRankingMetrics,
  createAggregatePantryCases,
  runCuratedScenarios,
  runExactMatchEvaluation,
  runQualityEvaluation,
} from './knn-evaluation.js';
import {
  loadEvaluationDataset,
  resolveCanonicalIngredient,
  resolveRecipeIngredientTerms,
  resolveUserIngredientTerms,
} from './knn-dataset.js';

const candidate = (
  id: string,
  name: string,
  ingredientIds: readonly string[],
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
  ingredients: ingredientIds.map((ingredientId) => ({
    id: ingredientId,
    name: ingredientId,
  })),
});

describe('KNN evaluation dataset adapter', () => {
  it('loads exact seed, generated, total, publication, and source-order counts', () => {
    const dataset = loadEvaluationDataset();

    expect(dataset.seed).toHaveLength(30);
    expect(dataset.generated).toHaveLength(470);
    expect(dataset.all).toHaveLength(500);
    expect(dataset.published).toHaveLength(487);
    expect(dataset.unpublished).toHaveLength(13);
    expect(dataset.all.slice(0, 30)).toEqual(dataset.seed);
    expect(dataset.all.slice(30)).toEqual(dataset.generated);
  });

  it('assigns stable synthetic IDs to all generated records', () => {
    const { generated } = loadEvaluationDataset();

    expect(generated[0]?.candidate.recipe.id).toBe('controlled-recipe-001');
    expect(generated[469]?.candidate.recipe.id).toBe(
      'controlled-recipe-470',
    );
    expect(new Set(generated.map(({ candidate: value }) => value.recipe.id))).toHaveLength(
      470,
    );
  });

  it('resolves canonical terms before aliases with canonical display identity', () => {
    expect(resolveCanonicalIngredient(' Chickpea ')).toEqual({
      id: 'chickpea',
      name: 'chickpea',
    });
    expect(resolveCanonicalIngredient('Garbanzo Bean')).toEqual({
      id: 'chickpea',
      name: 'chickpea',
    });
  });

  it('rejects unknown recipe ingredients', () => {
    expect(() => resolveRecipeIngredientTerms(['dragon fruit'])).toThrow(
      'Unknown controlled ingredient term: dragon fruit',
    );
  });

  it('rejects duplicate canonical concepts introduced through an alias', () => {
    expect(() =>
      resolveRecipeIngredientTerms(['chickpea', 'garbanzo bean']),
    ).toThrow('Duplicate canonical ingredient in adapted recipe: chickpea');
  });

  it('keeps unknown user terms separate without requiring database access', () => {
    expect(resolveUserIngredientTerms(['Tomato', 'Mystery Item'])).toEqual({
      recognizedIngredients: [{ id: 'tomato', name: 'tomato' }],
      unknownIngredients: ['mystery item'],
    });
  });
});

describe('matched-count baseline', () => {
  it('deduplicates inputs and excludes zero-overlap candidates', () => {
    const results = findMatchedCountBaseline({
      userIngredientIds: ['tomato', 'tomato'],
      candidates: [
        candidate('match', 'Match', ['tomato', 'tomato', 'onion']),
        candidate('none', 'None', ['garlic']),
      ],
      limit: 5,
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      recipe: { id: 'match' },
      matchedCount: 1,
      missingCount: 1,
      coverage: 0.5,
    });
  });

  it('ranks only by matched count before deterministic name and ID ties', () => {
    const results = findMatchedCountBaseline({
      userIngredientIds: ['tomato', 'onion'],
      candidates: [
        candidate('recipe-b', 'Same', ['tomato', 'garlic']),
        candidate('recipe-a', 'Same', ['tomato', 'salt']),
        candidate('more', 'Zulu', ['tomato', 'onion', 'garlic', 'salt']),
        candidate('alpha', 'Alpha', ['tomato', 'pepper']),
      ],
      limit: 10,
    });

    expect(results.map(({ recipe }) => recipe.id)).toEqual([
      'more',
      'alpha',
      'recipe-a',
      'recipe-b',
    ]);
  });
});

describe('curated KNN evaluation scenarios', () => {
  it('passes exactly the 18 locked formula-driven scenarios', () => {
    const results = runCuratedScenarios();

    expect(results).toHaveLength(CURATED_SCENARIO_COUNT);
    expect(results.every(({ passed }) => passed)).toBe(true);
    expect(results[1]?.name).toBe(
      'same matched count with different recipe sizes',
    );
    expect(results[2]?.name).toBe(
      'more matched ingredients but worse coverage',
    );
    expect(results.slice(14).map(({ name }) => name)).toEqual([
      'cuisine filter eligibility',
      'maximum preparation-time filter eligibility',
      'dietary-type filter eligibility',
      'allergen-exclusion filter eligibility',
    ]);
  });
});

describe('exact-match and aggregate evaluation', () => {
  it('passes every one of the 487 published exact-match top-1 cases', () => {
    const result = runExactMatchEvaluation(loadEvaluationDataset().published);

    expect(result).toEqual({
      caseCount: 487,
      passedCount: 487,
      top1SuccessRate: 1,
    });
  });

  it('selects exactly 100 source cases using the locked index formula', () => {
    const cases = createAggregatePantryCases(
      loadEvaluationDataset().published,
    );

    expect(cases).toHaveLength(AGGREGATE_CASE_COUNT);
    expect(cases[0]?.sourceIndex).toBe(0);
    expect(cases[99]?.sourceIndex).toBe(482);
    for (const pantryCase of cases) {
      expect(pantryCase.sourceIndex).toBe(
        Math.floor((pantryCase.caseIndex * 487) / 100),
      );
      expect(pantryCase.userIngredientIds.length).toBeGreaterThan(0);
      expect(pantryCase.removedIngredientIds).toHaveLength(
        1 +
          (pantryCase.caseIndex %
            Math.min(
              3,
              pantryCase.userIngredientIds.length +
                pantryCase.removedIngredientIds.length -
                1,
            )),
      );
      expect(pantryCase.removedIngredientIds).toEqual(
        [...pantryCase.removedIngredientIds].sort(),
      );
    }
  });

  it('calculates arithmetic and per-ranking metric means', () => {
    expect(average([0.25, 0.75, 1])).toBeCloseTo(2 / 3);
    expect(
      calculateBaselineRankingMetrics([
        {
          recipe: candidate('a', 'A', []).recipe,
          matchedCount: 2,
          missingCount: 1,
          coverage: 2 / 3,
          matchedIngredients: [],
          missingIngredients: [],
        },
        {
          recipe: candidate('b', 'B', []).recipe,
          matchedCount: 1,
          missingCount: 3,
          coverage: 0.25,
          matchedIngredients: [],
          missingIngredients: [],
        },
      ]),
    ).toEqual({
      top1Coverage: 2 / 3,
      topKCoverage: (2 / 3 + 0.25) / 2,
      topKMissingCount: 2,
    });
  });

  it('produces identical complete quality output on repeated runs', () => {
    const dataset = loadEvaluationDataset();
    const first = runQualityEvaluation(dataset);
    const second = runQualityEvaluation(dataset);

    expect(first.curatedScenarios).toHaveLength(18);
    expect(first.exactMatch.passedCount).toBe(487);
    expect(first.aggregate.caseCount).toBe(100);
    expect(second).toEqual(first);
  });
});
