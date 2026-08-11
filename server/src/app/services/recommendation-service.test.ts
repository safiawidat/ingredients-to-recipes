import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findIngredientsByNormalizedValuesMock,
  findPublishedRecipesWithIngredientsMock,
  findKNearestRecipesMock,
} = vi.hoisted(() => ({
  findIngredientsByNormalizedValuesMock: vi.fn(),
  findPublishedRecipesWithIngredientsMock: vi.fn(),
  findKNearestRecipesMock: vi.fn(),
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

    const result = await recommendRecipes({
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

    const result = await recommendRecipes({
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

    const result = await recommendRecipes({
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

    const result = await recommendRecipes({
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

    const result = await recommendRecipes({
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

    const result = await recommendRecipes({
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

    const result = await recommendRecipes({
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

    const promise = recommendRecipes({
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
  });

  it('fetches published recipe candidates exactly once for valid input', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['tomato', tomato]]),
    );

    await recommendRecipes({ ingredients: ['tomato'], limit: 5 });

    expect(findPublishedRecipesWithIngredientsMock).toHaveBeenCalledTimes(1);
    expect(findPublishedRecipesWithIngredientsMock).toHaveBeenCalledWith();
  });

  it('maps repository records to engine candidates without relation metadata', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['tomato', tomato]]),
    );
    findPublishedRecipesWithIngredientsMock.mockResolvedValue([
      repositoryCandidate,
    ]);

    await recommendRecipes({ ingredients: ['tomato'], limit: 5 });

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

    await recommendRecipes({ ingredients: ['tomato'], limit: 7.5 });

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

    const result = await recommendRecipes({
      ingredients: ['tomato'],
      limit: 5,
    });

    expect(result.recommendations).toBe(engineResults);
  });

  it('returns a successful empty recommendation list when the engine finds no overlap', async () => {
    findIngredientsByNormalizedValuesMock.mockResolvedValue(
      new Map([['tomato', tomato]]),
    );
    findKNearestRecipesMock.mockReturnValue([]);

    await expect(
      recommendRecipes({ ingredients: ['tomato'], limit: 5 }),
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

    await recommendRecipes({
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
        recommendRecipes({ ingredients, limit: 5 }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'NO_RECOGNIZED_INGREDIENTS',
        message: 'At least one ingredient must match a known ingredient',
      });

      expect(findIngredientsByNormalizedValuesMock).not.toHaveBeenCalled();
      expect(findPublishedRecipesWithIngredientsMock).not.toHaveBeenCalled();
      expect(findKNearestRecipesMock).not.toHaveBeenCalled();
    },
  );

  it('propagates unexpected lookup failures without fetching candidates', async () => {
    const lookupError = new Error('lookup unavailable');
    findIngredientsByNormalizedValuesMock.mockRejectedValue(lookupError);

    await expect(
      recommendRecipes({ ingredients: ['tomato'], limit: 5 }),
    ).rejects.toBe(lookupError);
    expect(findPublishedRecipesWithIngredientsMock).not.toHaveBeenCalled();
  });
});
