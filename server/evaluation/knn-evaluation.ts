import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  findKNearestRecipes,
  type RecommendationCandidate,
  type RecommendationRecipe,
  type RecommendationResult,
} from '../src/app/services/knn-recommendation-engine.js';
import {
  findMatchedCountBaseline,
  type BaselineResult,
} from './knn-baseline.js';
import {
  EXPECTED_PUBLISHED_RECIPE_COUNT,
  loadEvaluationDataset,
  resolveUserIngredientTerms,
  sortRecordsByRecipeNameAndId,
  toCandidates,
  type EvaluationDataset,
  type EvaluationRecipeRecord,
} from './knn-dataset.js';

export const CURATED_SCENARIO_COUNT = 18;
export const AGGREGATE_CASE_COUNT = 100;
export const QUALITY_TOP_K = 5;

export interface CuratedScenarioResult {
  id: number;
  name: string;
  passed: true;
}

export interface AggregatePantryCase {
  caseIndex: number;
  sourceIndex: number;
  sourceRecipeId: string;
  userIngredientIds: string[];
  removedIngredientIds: string[];
}

export interface RankingMetrics {
  top1Coverage: number;
  topKCoverage: number;
  topKMissingCount: number;
}

export interface AggregateComparisonResult {
  caseCount: number;
  knnTop1AverageCoverage: number;
  baselineTop1AverageCoverage: number;
  knnTop5AverageCoverage: number;
  baselineTop5AverageCoverage: number;
  knnTop5AverageMissingCount: number;
  baselineTop5AverageMissingCount: number;
  top1DisagreementCount: number;
  top1DisagreementPercentage: number;
}

export interface ExactMatchEvaluationResult {
  caseCount: number;
  passedCount: number;
  top1SuccessRate: number;
}

export interface QualityEvaluationResult {
  dataset: {
    seed: number;
    generated: number;
    total: number;
    published: number;
    unpublished: number;
  };
  curatedScenarios: CuratedScenarioResult[];
  curatedScenarioPassRate: number;
  exactMatch: ExactMatchEvaluationResult;
  aggregate: AggregateComparisonResult;
}

export interface EvaluationFilters {
  cuisine?: string;
  maxPreparationTime?: number;
  dietaryType?: string;
  excludeAllergens?: readonly string[];
}

const compareText = (left: string, right: string): number => {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

const createCandidate = (
  id: string,
  name: string,
  ingredientIds: readonly string[],
  overrides: Partial<RecommendationRecipe> = {},
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
    ...overrides,
  },
  ingredients: ingredientIds.map((ingredientId) => ({
    id: ingredientId,
    name: ingredientId,
  })),
});

export const filterEvaluationCandidates = (
  candidates: readonly RecommendationCandidate[],
  filters: EvaluationFilters,
): RecommendationCandidate[] =>
  candidates.filter(({ recipe }) => {
    if (filters.cuisine !== undefined && recipe.cuisine !== filters.cuisine) {
      return false;
    }
    if (
      filters.maxPreparationTime !== undefined &&
      (recipe.preparationTime === null ||
        recipe.preparationTime > filters.maxPreparationTime)
    ) {
      return false;
    }
    if (
      filters.dietaryType !== undefined &&
      !recipe.dietTags.includes(filters.dietaryType)
    ) {
      return false;
    }
    if (
      filters.excludeAllergens !== undefined &&
      filters.excludeAllergens.some((allergen) =>
        recipe.allergens.includes(allergen),
      )
    ) {
      return false;
    }
    return true;
  });

const runFilterScenario = (
  candidates: readonly RecommendationCandidate[],
  filters: EvaluationFilters,
  expectedEligibleIds: readonly string[],
): void => {
  const filtered = filterEvaluationCandidates(candidates, filters);
  assert.deepEqual(
    filtered.map(({ recipe }) => recipe.id),
    expectedEligibleIds,
  );

  const expectedSurvivors = candidates.filter(({ recipe }) =>
    expectedEligibleIds.includes(recipe.id),
  );
  const rankedFiltered = findKNearestRecipes({
    userIngredientIds: ['tomato'],
    candidates: filtered,
    limit: 5,
  });
  const rankedKnownSurvivors = findKNearestRecipes({
    userIngredientIds: ['tomato'],
    candidates: expectedSurvivors,
    limit: 5,
  });
  assert.deepEqual(rankedFiltered, rankedKnownSurvivors);
  assert.ok(
    rankedFiltered.every(({ recipe }) => expectedEligibleIds.includes(recipe.id)),
  );
};

export const runCuratedScenarios = (): CuratedScenarioResult[] => {
  const scenarios: Array<{ name: string; verify: () => void }> = [
    {
      name: 'exact match',
      verify: () => {
        const result = findKNearestRecipes({
          userIngredientIds: ['tomato', 'onion'],
          candidates: [
            createCandidate('exact', 'Exact', ['tomato', 'onion']),
          ],
          limit: 1,
        });
        assert.equal(result[0]?.score, 1);
        assert.equal(result[0]?.distance, 0);
        assert.equal(result[0]?.matchPercentage, 100);
        assert.deepEqual(result[0]?.missingIngredients, []);
      },
    },
    {
      name: 'same matched count with different recipe sizes',
      verify: () => {
        const candidates = [
          createCandidate('compact', 'Compact Tomato Plate', [
            'tomato',
            'onion',
            'garlic',
          ]),
          createCandidate('broad', 'Broad Pantry Stew', [
            'tomato',
            'onion',
            'garlic',
            'salt',
            'black pepper',
          ]),
        ];
        const input = ['tomato', 'onion'];
        const baseline = findMatchedCountBaseline({
          userIngredientIds: input,
          candidates,
          limit: 2,
        });
        const knn = findKNearestRecipes({
          userIngredientIds: input,
          candidates,
          limit: 2,
        });
        assert.deepEqual(
          baseline.map(({ recipe }) => recipe.id),
          ['broad', 'compact'],
        );
        assert.deepEqual(
          knn.map(({ recipe }) => recipe.id),
          ['compact', 'broad'],
        );
        assert.equal(knn[0]?.score, 2 / 3);
        assert.equal(knn[1]?.score, 2 / 5);
      },
    },
    {
      name: 'more matched ingredients but worse coverage',
      verify: () => {
        const candidates = [
          createCandidate('complete-pair', 'Complete Tomato Pair', [
            'tomato',
            'onion',
          ]),
          createCandidate('large-mix', 'Large Tomato Mix', [
            'tomato',
            'onion',
            'garlic',
            'salt',
            'black pepper',
          ]),
        ];
        const input = ['tomato', 'onion', 'garlic'];
        assert.deepEqual(
          findMatchedCountBaseline({
            userIngredientIds: input,
            candidates,
            limit: 2,
          }).map(({ recipe }) => recipe.id),
          ['large-mix', 'complete-pair'],
        );
        const knn = findKNearestRecipes({
          userIngredientIds: input,
          candidates,
          limit: 2,
        });
        assert.deepEqual(
          knn.map(({ recipe }) => recipe.id),
          ['complete-pair', 'large-mix'],
        );
        assert.equal(knn[0]?.score, 1);
        assert.equal(knn[1]?.score, 3 / 5);
      },
    },
    {
      name: 'equal coverage with different missing counts',
      verify: () => {
        const result = findKNearestRecipes({
          userIngredientIds: ['tomato', 'onion'],
          candidates: [
            createCandidate('two-missing', 'Two Missing', [
              'tomato',
              'onion',
              'garlic',
              'salt',
            ]),
            createCandidate('one-missing', 'One Missing', [
              'tomato',
              'garlic',
            ]),
          ],
          limit: 2,
        });
        assert.deepEqual(
          result.map(({ recipe }) => recipe.id),
          ['one-missing', 'two-missing'],
        );
        assert.ok(result.every(({ score }) => score === 0.5));
      },
    },
    {
      name: 'fully covered recipes with different matched counts',
      verify: () => {
        const result = findKNearestRecipes({
          userIngredientIds: ['tomato', 'onion', 'garlic'],
          candidates: [
            createCandidate('pair', 'Pair', ['tomato', 'onion']),
            createCandidate('trio', 'Trio', ['tomato', 'onion', 'garlic']),
          ],
          limit: 2,
        });
        assert.deepEqual(
          result.map(({ recipe }) => recipe.id),
          ['trio', 'pair'],
        );
      },
    },
    {
      name: 'recipe name fallback',
      verify: () => {
        const result = findKNearestRecipes({
          userIngredientIds: ['tomato'],
          candidates: [
            createCandidate('z', 'Zulu', ['tomato', 'garlic']),
            createCandidate('a', 'Alpha', ['tomato', 'onion']),
          ],
          limit: 2,
        });
        assert.deepEqual(
          result.map(({ recipe }) => recipe.name),
          ['Alpha', 'Zulu'],
        );
      },
    },
    {
      name: 'recipe ID fallback',
      verify: () => {
        const result = findKNearestRecipes({
          userIngredientIds: ['tomato'],
          candidates: [
            createCandidate('recipe-b', 'Same Name', ['tomato', 'garlic']),
            createCandidate('recipe-a', 'Same Name', ['tomato', 'onion']),
          ],
          limit: 2,
        });
        assert.deepEqual(
          result.map(({ recipe }) => recipe.id),
          ['recipe-a', 'recipe-b'],
        );
      },
    },
    {
      name: 'zero overlap exclusion',
      verify: () => {
        const result = findKNearestRecipes({
          userIngredientIds: ['tomato'],
          candidates: [
            createCandidate('match', 'Match', ['tomato', 'onion']),
            createCandidate('none', 'None', ['garlic', 'salt']),
          ],
          limit: 5,
        });
        assert.deepEqual(result.map(({ recipe }) => recipe.id), ['match']);
      },
    },
    {
      name: 'sparse pantry',
      verify: () => {
        const result = findKNearestRecipes({
          userIngredientIds: ['tomato'],
          candidates: [
            createCandidate('partial', 'Partial', ['tomato', 'onion']),
            createCandidate('exact', 'Exact', ['tomato']),
          ],
          limit: 2,
        });
        assert.equal(result[0]?.recipe.id, 'exact');
        assert.equal(result[0]?.score, 1);
      },
    },
    {
      name: 'broad pantry with extra ingredients',
      verify: () => {
        const candidates = [
          createCandidate('recipe', 'Recipe', ['tomato', 'onion']),
        ];
        const exact = findKNearestRecipes({
          userIngredientIds: ['tomato', 'onion'],
          candidates,
          limit: 1,
        });
        const broad = findKNearestRecipes({
          userIngredientIds: ['tomato', 'onion', 'garlic', 'salt', 'pepper'],
          candidates,
          limit: 1,
        });
        assert.deepEqual(broad, exact);
      },
    },
    {
      name: 'limit and fewer-than-K behavior',
      verify: () => {
        const candidates = [
          createCandidate('exact', 'Exact', ['tomato']),
          createCandidate('partial', 'Partial', ['tomato', 'onion']),
          createCandidate('none', 'None', ['garlic']),
        ];
        assert.equal(
          findKNearestRecipes({
            userIngredientIds: ['tomato'],
            candidates,
            limit: 1,
          }).length,
          1,
        );
        assert.equal(
          findKNearestRecipes({
            userIngredientIds: ['tomato'],
            candidates,
            limit: 10,
          }).length,
          2,
        );
      },
    },
    {
      name: 'repeat and reversed candidate-order determinism',
      verify: () => {
        const candidates = [
          createCandidate('z', 'Zulu', ['tomato', 'garlic']),
          createCandidate('exact', 'Exact', ['tomato']),
          createCandidate('a', 'Alpha', ['tomato', 'onion']),
        ];
        const input = {
          userIngredientIds: ['tomato'],
          candidates,
          limit: 5,
        };
        const first = findKNearestRecipes(input);
        assert.deepEqual(findKNearestRecipes(input), first);
        assert.deepEqual(
          findKNearestRecipes({ ...input, candidates: [...candidates].reverse() }),
          first,
        );
      },
    },
    {
      name: 'alias resolves identically to canonical input',
      verify: () => {
        const canonical = resolveUserIngredientTerms(['chickpea']);
        const alias = resolveUserIngredientTerms(['Garbanzo Bean']);
        assert.deepEqual(alias.recognizedIngredients, canonical.recognizedIngredients);
        assert.deepEqual(alias.unknownIngredients, []);
      },
    },
    {
      name: 'known and unknown terms',
      verify: () => {
        const resolution = resolveUserIngredientTerms([
          ' Tomato ',
          'dragon fruit',
          'TOMATO',
        ]);
        assert.deepEqual(
          resolution.recognizedIngredients.map(({ id }) => id),
          ['tomato'],
        );
        assert.deepEqual(resolution.unknownIngredients, ['dragon fruit']);
        const result = findKNearestRecipes({
          userIngredientIds: resolution.recognizedIngredients.map(({ id }) => id),
          candidates: [createCandidate('tomato', 'Tomato', ['tomato'])],
          limit: 1,
        });
        assert.equal(result[0]?.score, 1);
      },
    },
    {
      name: 'cuisine filter eligibility',
      verify: () => {
        runFilterScenario(
          [
            createCandidate('med', 'Mediterranean', ['tomato'], {
              cuisine: 'Mediterranean-inspired',
            }),
            createCandidate('asian', 'Asian', ['tomato'], {
              cuisine: 'Asian-inspired',
            }),
          ],
          { cuisine: 'Mediterranean-inspired' },
          ['med'],
        );
      },
    },
    {
      name: 'maximum preparation-time filter eligibility',
      verify: () => {
        runFilterScenario(
          [
            createCandidate('quick', 'Quick', ['tomato'], {
              preparationTime: 20,
            }),
            createCandidate('slow', 'Slow', ['tomato'], {
              preparationTime: 45,
            }),
            createCandidate('unknown-time', 'Unknown Time', ['tomato']),
          ],
          { maxPreparationTime: 30 },
          ['quick'],
        );
      },
    },
    {
      name: 'dietary-type filter eligibility',
      verify: () => {
        runFilterScenario(
          [
            createCandidate('vegan', 'Vegan', ['tomato'], {
              dietTags: ['vegan'],
            }),
            createCandidate('other', 'Other', ['tomato'], {
              dietTags: ['vegetarian'],
            }),
          ],
          { dietaryType: 'vegan' },
          ['vegan'],
        );
      },
    },
    {
      name: 'allergen-exclusion filter eligibility',
      verify: () => {
        runFilterScenario(
          [
            createCandidate('safe', 'Safe', ['tomato']),
            createCandidate('soy', 'Soy', ['tomato'], {
              allergens: ['soy'],
            }),
            createCandidate('peanut', 'Peanut', ['tomato'], {
              allergens: ['peanut'],
            }),
          ],
          { excludeAllergens: ['soy', 'peanut'] },
          ['safe'],
        );
      },
    },
  ];

  assert.equal(scenarios.length, CURATED_SCENARIO_COUNT);
  return scenarios.map(({ name, verify }, index) => {
    verify();
    return { id: index + 1, name, passed: true };
  });
};

export const average = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const calculateKnnRankingMetrics = (
  results: readonly RecommendationResult[],
): RankingMetrics => ({
  top1Coverage: results[0]?.score ?? 0,
  topKCoverage: average(results.map(({ score }) => score)),
  topKMissingCount: average(
    results.map(({ missingIngredients }) => missingIngredients.length),
  ),
});

export const calculateBaselineRankingMetrics = (
  results: readonly BaselineResult[],
): RankingMetrics => ({
  top1Coverage: results[0]?.coverage ?? 0,
  topKCoverage: average(results.map(({ coverage }) => coverage)),
  topKMissingCount: average(results.map(({ missingCount }) => missingCount)),
});

export const createAggregatePantryCases = (
  publishedRecords: readonly EvaluationRecipeRecord[],
): AggregatePantryCase[] => {
  assert.equal(publishedRecords.length, EXPECTED_PUBLISHED_RECIPE_COUNT);
  const sortedRecords = sortRecordsByRecipeNameAndId(publishedRecords);

  return Array.from({ length: AGGREGATE_CASE_COUNT }, (_, caseIndex) => {
    const sourceIndex = Math.floor(
      (caseIndex * EXPECTED_PUBLISHED_RECIPE_COUNT) / AGGREGATE_CASE_COUNT,
    );
    const source = sortedRecords[sourceIndex];
    assert.ok(source);
    const sortedIngredients = [...source.candidate.ingredients].sort(
      (left, right) =>
        compareText(left.name, right.name) || compareText(left.id, right.id),
    );
    const maximumRemoval = Math.min(3, sortedIngredients.length - 1);
    assert.ok(maximumRemoval >= 1);
    const removalCount = 1 + (caseIndex % maximumRemoval);
    const retainedCount = sortedIngredients.length - removalCount;

    return {
      caseIndex,
      sourceIndex,
      sourceRecipeId: source.candidate.recipe.id,
      userIngredientIds: sortedIngredients
        .slice(0, retainedCount)
        .map(({ id }) => id),
      removedIngredientIds: sortedIngredients
        .slice(retainedCount)
        .map(({ id }) => id),
    };
  });
};

export const runExactMatchEvaluation = (
  publishedRecords: readonly EvaluationRecipeRecord[],
): ExactMatchEvaluationResult => {
  assert.equal(publishedRecords.length, EXPECTED_PUBLISHED_RECIPE_COUNT);
  const candidates = toCandidates(publishedRecords);
  let passedCount = 0;

  for (const { candidate } of publishedRecords) {
    const result = findKNearestRecipes({
      userIngredientIds: candidate.ingredients.map(({ id }) => id),
      candidates,
      limit: 1,
    });
    const top = result[0];
    assert.ok(top, `No exact-match result for ${candidate.recipe.name}`);
    assert.equal(top.recipe.id, candidate.recipe.id);
    assert.equal(top.score, 1);
    assert.equal(top.distance, 0);
    assert.equal(top.matchPercentage, 100);
    assert.equal(top.missingIngredients.length, 0);
    passedCount += 1;
  }

  return {
    caseCount: publishedRecords.length,
    passedCount,
    top1SuccessRate: passedCount / publishedRecords.length,
  };
};

export const runAggregateComparison = (
  publishedRecords: readonly EvaluationRecipeRecord[],
): AggregateComparisonResult => {
  const candidates = toCandidates(publishedRecords);
  const cases = createAggregatePantryCases(publishedRecords);
  const knnMetrics: RankingMetrics[] = [];
  const baselineMetrics: RankingMetrics[] = [];
  let top1DisagreementCount = 0;

  for (const pantryCase of cases) {
    const knn = findKNearestRecipes({
      userIngredientIds: pantryCase.userIngredientIds,
      candidates,
      limit: QUALITY_TOP_K,
    });
    const baseline = findMatchedCountBaseline({
      userIngredientIds: pantryCase.userIngredientIds,
      candidates,
      limit: QUALITY_TOP_K,
    });
    assert.ok(knn.length > 0);
    assert.ok(baseline.length > 0);
    knnMetrics.push(calculateKnnRankingMetrics(knn));
    baselineMetrics.push(calculateBaselineRankingMetrics(baseline));
    if (knn[0]?.recipe.id !== baseline[0]?.recipe.id) {
      top1DisagreementCount += 1;
    }
  }

  return {
    caseCount: cases.length,
    knnTop1AverageCoverage: average(
      knnMetrics.map(({ top1Coverage }) => top1Coverage),
    ),
    baselineTop1AverageCoverage: average(
      baselineMetrics.map(({ top1Coverage }) => top1Coverage),
    ),
    knnTop5AverageCoverage: average(
      knnMetrics.map(({ topKCoverage }) => topKCoverage),
    ),
    baselineTop5AverageCoverage: average(
      baselineMetrics.map(({ topKCoverage }) => topKCoverage),
    ),
    knnTop5AverageMissingCount: average(
      knnMetrics.map(({ topKMissingCount }) => topKMissingCount),
    ),
    baselineTop5AverageMissingCount: average(
      baselineMetrics.map(({ topKMissingCount }) => topKMissingCount),
    ),
    top1DisagreementCount,
    top1DisagreementPercentage:
      (top1DisagreementCount / cases.length) * 100,
  };
};

export const runQualityEvaluation = (
  dataset: EvaluationDataset = loadEvaluationDataset(),
): QualityEvaluationResult => {
  const curatedScenarios = runCuratedScenarios();
  return {
    dataset: {
      seed: dataset.seed.length,
      generated: dataset.generated.length,
      total: dataset.all.length,
      published: dataset.published.length,
      unpublished: dataset.unpublished.length,
    },
    curatedScenarios,
    curatedScenarioPassRate:
      curatedScenarios.length / CURATED_SCENARIO_COUNT,
    exactMatch: runExactMatchEvaluation(dataset.published),
    aggregate: runAggregateComparison(dataset.published),
  };
};

const fixed = (value: number): string => value.toFixed(6);

export const formatQualityEvaluation = (
  result: QualityEvaluationResult,
): string => {
  const { dataset, exactMatch, aggregate } = result;
  return [
    'KNN quality evaluation',
    `Dataset: ${dataset.seed} seed + ${dataset.generated} generated = ${dataset.total} total; ${dataset.published} published; ${dataset.unpublished} unpublished`,
    `Curated scenarios: ${result.curatedScenarios.length}/${CURATED_SCENARIO_COUNT} passed (${fixed(result.curatedScenarioPassRate * 100)}%)`,
    `Exact-match top-1: ${exactMatch.passedCount}/${exactMatch.caseCount} (${fixed(exactMatch.top1SuccessRate * 100)}%)`,
    `Aggregate cases: ${aggregate.caseCount}`,
    `KNN top-1 average coverage: ${fixed(aggregate.knnTop1AverageCoverage)}`,
    `Baseline top-1 average coverage: ${fixed(aggregate.baselineTop1AverageCoverage)}`,
    `KNN top-5 average coverage: ${fixed(aggregate.knnTop5AverageCoverage)}`,
    `Baseline top-5 average coverage: ${fixed(aggregate.baselineTop5AverageCoverage)}`,
    `KNN top-5 average missing count: ${fixed(aggregate.knnTop5AverageMissingCount)}`,
    `Baseline top-5 average missing count: ${fixed(aggregate.baselineTop5AverageMissingCount)}`,
    `Top-1 disagreements: ${aggregate.top1DisagreementCount}/${aggregate.caseCount} (${fixed(aggregate.top1DisagreementPercentage)}%)`,
  ].join('\n');
};

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedPath === import.meta.url) {
  try {
    console.info(formatQualityEvaluation(runQualityEvaluation()));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
