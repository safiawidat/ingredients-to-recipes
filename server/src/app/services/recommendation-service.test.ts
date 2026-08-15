import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createRecommendationHistoryMock,
  findIngredientsByNormalizedValuesMock,
  findPublishedRecipesWithIngredientsMock,
  findKNearestRecipesMock,
} = vi.hoisted(() => ({
  createRecommendationHistoryMock: vi.fn(),
  findIngredientsByNormalizedValuesMock: vi.fn(),
  findPublishedRecipesWithIngredientsMock: vi.fn(),
  findKNearestRecipesMock: vi.fn(),
}));

vi.mock('../repositories/recommendation-history-repository.js', () => ({
  createRecommendationHistory: createRecommendationHistoryMock,
}));

vi.mock('./ingredient-lookup-service.js', () => ({
  findIngredientsByNormalizedValues: findIngredientsByNormalizedValuesMock,
}));

vi.mock('../repositories/recipe-repository.js', () => ({
  findPublishedRecipesWithIngredients:
    findPublishedRecipesWithIngredientsMock,
}));

vi.mock('./knn-recommendation-engine.js', () => ({
  findKNearestRecipes: findKNearestRecipesMock,
}));

import { ApplicationError } from '../errors/application-error.js';
import { recommendRecipes } from './recommendation-service.js';

const tomato = { id: 'ingredient-tomato', name: 'tomato' };
const oliveOil = { id: 'ingredient-olive-oil', name: 'olive oil' };
const chickpea = { id: 'ingredient-chickpea', name: 'chickpea' };

const repositoryCandidate = {
  id: 'recipe-1',
  name: 'Tomato Chickpea Salad',
  description: 'A fresh salad',
  cuisine: 'Mediterranean',
  preparationTime: 15,
  servings: 2,
  imageUrl: 'https://example.com/salad.jpg',
  dietTags: ['vegan'],
  allergens: ['sesame'],
  ingredients: [
    { ingredient: tomato },
    { ingredient: chickpea },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  createRecommendationHistoryMock.mockResolvedValue({});
  findPublishedRecipesWithIngredientsMock.mockResolvedValue([]);
  findKNearestRecipesMock.mockReturnValue([]);
});

describe('recommendRecipes', () => {
  it('normalizes raw ingredient strings before resolving them', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([
        ['tomatoes', tomato],
        ['olive oil', oliveOil],
      ]),
    );

    const result = await recommendRecipes('user-1', {
      ingredients: [' Tomatoes ', '  olive   oil '],
      limit: 5,
    });

    expect(findIngredientsByNormalizedValuesMock).toHaveBeenCalledWith([
      'tomatoes',
      'olive oil',
    ]);
    expect(result.recognizedIngredients).toEqual([tomato, oliveOil]);
  });

  it('returns the canonical ingredient when an alias resolves', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['garbanzo bean', chickpea]]),
    );

    const result = await recommendRecipes('user-1', {
      ingredients: ['Garbanzo Bean'],
      limit: 5,
    });

    expect(result.recognizedIngredients).toEqual([chickpea]);
  });

  it('deduplicates canonical and alias inputs by canonical ingredient ID', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([
        ['chickpea', chickpea],
        ['chickpeas', chickpea],
        ['garbanzo bean', chickpea],
      ]),
    );

    const result = await recommendRecipes('user-1', {
      ingredients: ['chickpea', 'chickpeas', 'garbanzo bean'],
      limit: 5,
    });

    expect(result.recognizedIngredients).toEqual([chickpea]);
    expect(findKNearestRecipesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userIngredientIds: new Set(['ingredient-chickpea']),
      }),
    );
  });

  it('preserves first canonical recognition order', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([
        ['garbanzo bean', chickpea],
        ['tomato', tomato],
        ['chickpeas', chickpea],
        ['olive oil', oliveOil],
      ]),
    );

    const result = await recommendRecipes('user-1', {
      ingredients: [
        'garbanzo bean',
        'tomato',
        'chickpeas',
        'olive oil',
      ],
      limit: 5,
    });

    expect(result.recognizedIngredients).toEqual([
      chickpea,
      tomato,
      oliveOil,
    ]);
  });

  it('returns unknown ingredients as normalized strings', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([
        ['tomato', tomato],
        ['dragon fruit', null],
      ]),
    );

    const result = await recommendRecipes('user-1', {
      ingredients: ['Tomato', '  Dragon   Fruit '],
      limit: 5,
    });

    expect(result.unknownIngredients).toEqual(['dragon fruit']);
  });

  it('returns duplicate normalized unknown inputs once', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([
        ['tomato', tomato],
        ['dragon fruit', null],
      ]),
    );

    const result = await recommendRecipes('user-1', {
      ingredients: ['tomato', 'Dragon Fruit', '  dragon   fruit '],
      limit: 5,
    });

    expect(findIngredientsByNormalizedValuesMock).toHaveBeenCalledWith([
      'tomato',
      'dragon fruit',
    ]);
    expect(result.unknownIngredients).toEqual(['dragon fruit']);
  });

  it('continues to recommend for a mix of known and unknown inputs', async () => {
    const engineResults = [{ recipe: { id: 'recipe-1' }, score: 0.5 }];
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([
        ['tomato', tomato],
        ['mystery item', null],
      ]),
    );
    findKNearestRecipesMock.mockReturnValue(engineResults);

    const result = await recommendRecipes('user-1', {
      ingredients: ['tomato', 'mystery item'],
      limit: 3,
    });

    expect(result.unknownIngredients).toEqual(['mystery item']);
    expect(result.recommendations).toBe(engineResults);
  });

  it('throws the application error and skips candidate fetching when none resolve', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['unknown', null]]),
    );

    const promise = recommendRecipes('user-1', {
      ingredients: ['Unknown'],
      limit: 5,
    });

    await expect(promise).rejects.toBeInstanceOf(ApplicationError);
    await expect(promise).rejects.toMatchObject({
      statusCode: 400,
      code: 'NO_RECOGNIZED_INGREDIENTS',
      message: 'At least one ingredient must match a known ingredient',
    });
    expect(findPublishedRecipesWithIngredientsMock).not.toHaveBeenCalled();
    expect(findKNearestRecipesMock).not.toHaveBeenCalled();
    expect(createRecommendationHistoryMock).not.toHaveBeenCalled();
  });

  it('fetches published recipe candidates exactly once for valid input', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['tomato', tomato]]),
    );

    await recommendRecipes('user-1', { ingredients: ['tomato'], limit: 5 });

    expect(findPublishedRecipesWithIngredientsMock).toHaveBeenCalledTimes(1);
    expect(findPublishedRecipesWithIngredientsMock).toHaveBeenCalledWith();
  });

  it('forwards validated filters to the single candidate lookup', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['tomato', tomato]]),
    );
    const filters = {
      cuisine: 'Mediterranean-inspired' as const,
      maxPreparationTime: 30,
      dietaryType: 'vegan' as const,
      excludeAllergens: ['peanut', 'soy'] as const,
    };

    await recommendRecipes('user-1', {
      ingredients: ['tomato'],
      limit: 5,
      filters: {
        ...filters,
        excludeAllergens: [...filters.excludeAllergens],
      },
    });

    expect(findPublishedRecipesWithIngredientsMock).toHaveBeenCalledTimes(1);
    expect(findPublishedRecipesWithIngredientsMock).toHaveBeenCalledWith({
      ...filters,
      excludeAllergens: ['peanut', 'soy'],
    });
  });

  it('passes only filter-eligible repository candidates to KNN', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['tomato', tomato]]),
    );
    findPublishedRecipesWithIngredientsMock.mockResolvedValue([
      repositoryCandidate,
    ]);

    await recommendRecipes('user-1', {
      ingredients: ['tomato'],
      limit: 5,
      filters: { dietaryType: 'vegan' },
    });

    expect(findKNearestRecipesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        candidates: [
          expect.objectContaining({
            recipe: expect.objectContaining({ id: 'recipe-1' }),
          }),
        ],
      }),
    );
  });

  it('maps repository records to engine candidates without relation metadata', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['tomato', tomato]]),
    );
    findPublishedRecipesWithIngredientsMock.mockResolvedValue([
      repositoryCandidate,
    ]);

    await recommendRecipes('user-1', { ingredients: ['tomato'], limit: 5 });

    expect(findKNearestRecipesMock).toHaveBeenCalledWith({
      userIngredientIds: new Set(['ingredient-tomato']),
      candidates: [
        {
          recipe: {
            id: 'recipe-1',
            name: 'Tomato Chickpea Salad',
            description: 'A fresh salad',
            cuisine: 'Mediterranean',
            preparationTime: 15,
            servings: 2,
            imageUrl: 'https://example.com/salad.jpg',
            dietTags: ['vegan'],
            allergens: ['sesame'],
          },
          ingredients: [tomato, chickpea],
        },
      ],
      limit: 5,
    });
  });

  it('passes the limit unchanged to the engine', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['tomato', tomato]]),
    );

    await recommendRecipes('user-1', {
      ingredients: ['tomato'],
      limit: 7.5,
    });

    expect(findKNearestRecipesMock).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 7.5 }),
    );
  });

  it('returns engine results without reranking or rewriting scores', async () => {
    const engineResults = [
      { recipe: { id: 'second' }, score: 0.25 },
      { recipe: { id: 'first' }, score: 0.9 },
    ];
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['tomato', tomato]]),
    );
    findKNearestRecipesMock.mockReturnValue(engineResults);

    const result = await recommendRecipes('user-1', {
      ingredients: ['tomato'],
      limit: 5,
    });

    expect(result.recommendations).toBe(engineResults);
  });

  it('persists normalized search data and ordered recommendation IDs', async () => {
    const engineResults = [
      { recipe: { id: 'recipe-2' } },
      { recipe: { id: 'recipe-1' } },
    ];
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([
        ['tomato', tomato],
        ['garbanzo bean', chickpea],
        ['mystery item', null],
      ]),
    );
    findKNearestRecipesMock.mockReturnValue(engineResults);

    const result = await recommendRecipes('user-1', {
      ingredients: [
        ' Tomato ',
        'tomato',
        ' Garbanzo   Bean ',
        'Mystery Item',
      ],
      limit: 10,
    });

    expect(createRecommendationHistoryMock).toHaveBeenCalledWith({
      userId: 'user-1',
      inputIngredients: ['tomato', 'garbanzo bean', 'mystery item'],
      filters: { limit: 10 },
      results: {
        recognizedIngredients: ['tomato', 'chickpea'],
        unknownIngredients: ['mystery item'],
        recipeIds: ['recipe-2', 'recipe-1'],
      },
    });
    expect(result.recommendations).toBe(engineResults);
  });

  it('persists active recommendation filters with the limit', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['tomato', tomato]]),
    );

    await recommendRecipes('user-1', {
      ingredients: ['tomato'],
      limit: 5,
      filters: {
        cuisine: 'Mediterranean-inspired',
        maxPreparationTime: 30,
        dietaryType: 'vegan',
        excludeAllergens: ['peanut', 'soy'],
      },
    });

    expect(createRecommendationHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: {
          limit: 5,
          cuisine: 'Mediterranean-inspired',
          maxPreparationTime: 30,
          dietaryType: 'vegan',
          excludeAllergens: ['peanut', 'soy'],
        },
      }),
    );
  });

  it('persists successful zero-result searches', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['tomato', tomato]]),
    );

    await recommendRecipes('user-1', {
      ingredients: ['tomato'],
      limit: 5,
    });

    expect(createRecommendationHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        results: expect.objectContaining({ recipeIds: [] }),
      }),
    );
  });

  it('persists repeated successful searches independently', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['tomato', tomato]]),
    );

    await recommendRecipes('user-1', {
      ingredients: ['tomato'],
      limit: 5,
    });
    await recommendRecipes('user-1', {
      ingredients: ['tomato'],
      limit: 5,
    });

    expect(createRecommendationHistoryMock).toHaveBeenCalledTimes(2);
  });

  it('does not persist when candidate lookup fails', async () => {
    const error = new Error('candidate lookup failed');
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['tomato', tomato]]),
    );
    findPublishedRecipesWithIngredientsMock.mockRejectedValue(error);

    await expect(
      recommendRecipes('user-1', { ingredients: ['tomato'], limit: 5 }),
    ).rejects.toBe(error);
    expect(createRecommendationHistoryMock).not.toHaveBeenCalled();
  });

  it('does not persist when recommendation processing fails', async () => {
    const error = new Error('KNN failed');
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['tomato', tomato]]),
    );
    findKNearestRecipesMock.mockImplementation(() => {
      throw error;
    });

    await expect(
      recommendRecipes('user-1', { ingredients: ['tomato'], limit: 5 }),
    ).rejects.toBe(error);
    expect(createRecommendationHistoryMock).not.toHaveBeenCalled();
  });

  it('propagates history failures instead of returning false success', async () => {
    const error = new Error('history write failed');
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['tomato', tomato]]),
    );
    createRecommendationHistoryMock.mockRejectedValue(error);

    await expect(
      recommendRecipes('user-1', { ingredients: ['tomato'], limit: 5 }),
    ).rejects.toBe(error);
  });

  it('returns a successful empty recommendation list when the engine finds no overlap', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['tomato', tomato]]),
    );
    findKNearestRecipesMock.mockReturnValue([]);

    await expect(
      recommendRecipes('user-1', { ingredients: ['tomato'], limit: 5 }),
    ).resolves.toEqual({
      recognizedIngredients: [tomato],
      unknownIngredients: [],
      recommendations: [],
    });
  });

  it('uses one batch lookup for all normalized inputs', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([
        ['tomato', tomato],
        ['olive oil', oliveOil],
        ['unknown', null],
      ]),
    );

    await recommendRecipes('user-1', {
      ingredients: ['Tomato', 'Olive Oil', 'Unknown'],
      limit: 5,
    });

    expect(findIngredientsByNormalizedValuesMock).toHaveBeenCalledTimes(1);
    expect(findIngredientsByNormalizedValuesMock).toHaveBeenCalledWith([
      'tomato',
      'olive oil',
      'unknown',
    ]);
  });

  it.each<[string[]]>([[[]], [['', '   ', '\t']]])(
    'throws the same application error when normalization removes every input',
    async (ingredients) => {
      await expect(
        recommendRecipes('user-1', { ingredients, limit: 5 }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'NO_RECOGNIZED_INGREDIENTS',
        message: 'At least one ingredient must match a known ingredient',
      });

      expect(findIngredientsByNormalizedValuesMock).not.toHaveBeenCalled();
      expect(findPublishedRecipesWithIngredientsMock).not.toHaveBeenCalled();
      expect(findKNearestRecipesMock).not.toHaveBeenCalled();
      expect(createRecommendationHistoryMock).not.toHaveBeenCalled();
    },
  );

  it('propagates unexpected lookup failures without fetching candidates', async () => {
    const lookupError = new Error('lookup unavailable');
    findIngredientsByNormalizedValuesMock.mockRejectedValue(lookupError);

    await expect(
      recommendRecipes('user-1', { ingredients: ['tomato'], limit: 5 }),
    ).rejects.toBe(lookupError);
    expect(findPublishedRecipesWithIngredientsMock).not.toHaveBeenCalled();
    expect(createRecommendationHistoryMock).not.toHaveBeenCalled();
  });
});
