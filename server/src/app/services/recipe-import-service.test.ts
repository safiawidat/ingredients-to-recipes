import { beforeEach, describe, expect, it, vi } from 'vitest';

const { importRecipesAtomicallyMock, lookupIngredientsMock } = vi.hoisted(
  () => ({
    importRecipesAtomicallyMock: vi.fn(),
    lookupIngredientsMock: vi.fn(),
  }),
);

vi.mock('../repositories/recipe-import-repository.js', () => ({
  importRecipesAtomically: importRecipesAtomicallyMock,
}));

vi.mock('./ingredient-lookup-service.js', () => ({
  findIngredientsByNormalizedValues: lookupIngredientsMock,
}));

import { importRecipes } from './recipe-import-service.js';

const ingredient = (name: string) => ({
  name,
  quantity: null,
  unit: null,
  category: 'MAIN',
});

const recipe = (name: string, ingredientNames = ['tomato']) => ({
  name,
  description: null,
  instructions: 'Cook it.',
  cuisine: null,
  preparationTime: null,
  servings: null,
  imageUrl: null,
  sourceUrl: null,
  dietTags: [],
  allergens: [],
  isPublished: true,
  ingredients: ingredientNames.map(ingredient),
});

beforeEach(() => {
  vi.resetAllMocks();
  lookupIngredientsMock.mockImplementation((terms: string[]) =>
    Promise.resolve(
      new Map(
        terms.map((term) => [
          term,
          { id: `id-${term === 'scallion' ? 'green onion' : term}`, name: term === 'scallion' ? 'green onion' : term },
        ]),
      ),
    ),
  );
  importRecipesAtomicallyMock.mockImplementation((records: unknown[]) =>
    Promise.resolve({
      importedRecordIndexes: records.map(
        (record) => (record as { recordIndex: number }).recordIndex,
      ),
      existingDuplicateRecordIndexes: [],
    }),
  );
});

describe('importRecipes', () => {
  it('resolves canonical and alias terms in one global batch', async () => {
    await importRecipes({
      recipes: [recipe('Recipe A', [' Tomato ', 'Scallion'])],
    });

    expect(lookupIngredientsMock).toHaveBeenCalledWith(['tomato', 'scallion']);
    expect(importRecipesAtomicallyMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          name: 'Recipe A',
          ingredients: [
            expect.objectContaining({ ingredientId: 'id-tomato' }),
            expect.objectContaining({ ingredientId: 'id-green onion' }),
          ],
        }),
      ],
      expect.any(Function),
    );
  });

  it('rejects every unknown occurrence before repository writes', async () => {
    lookupIngredientsMock.mockResolvedValue(
      new Map([
        ['tomato', { id: 'id-tomato', name: 'tomato' }],
        ['dragon fruit', null],
      ]),
    );

    await expect(
      importRecipes({
        recipes: [
          recipe('Recipe A', ['Dragon   Fruit']),
          recipe('Recipe B', ['dragon fruit']),
        ],
      }),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: 'UNKNOWN_INGREDIENTS',
      details: {
        totalErrors: 2,
        unknownIngredients: ['dragon fruit'],
        totalUnknownIngredients: 1,
      },
    });
    expect(importRecipesAtomicallyMock).not.toHaveBeenCalled();
  });

  it('rejects canonical and alias entries resolving to the same ingredient', async () => {
    lookupIngredientsMock.mockResolvedValue(
      new Map([
        ['green onion', { id: 'ingredient-1', name: 'green onion' }],
        ['scallion', { id: 'ingredient-1', name: 'green onion' }],
      ]),
    );

    await expect(
      importRecipes({
        recipes: [recipe('Recipe A', ['green onion', 'scallion'])],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: {
        recordErrors: [
          expect.objectContaining({
            recordIndex: 0,
            path: 'ingredients[1].name',
            code: 'DUPLICATE_RECIPE_INGREDIENT',
          }),
        ],
      },
    });
    expect(importRecipesAtomicallyMock).not.toHaveBeenCalled();
  });

  it('skips later case and whitespace duplicates in the payload', async () => {
    const result = await importRecipes({
      recipes: [recipe('Tomato  Soup'), recipe(' tomato soup ')],
    });

    expect(importRecipesAtomicallyMock.mock.calls[0]?.[0]).toHaveLength(1);
    expect(result).toEqual({
      received: 2,
      imported: 1,
      skippedDuplicates: 1,
      duplicates: [
        {
          recordIndex: 1,
          name: 'tomato soup',
          reason: 'DUPLICATE_IN_PAYLOAD',
        },
      ],
    });
  });

  it('combines existing and payload skips with exact success counts', async () => {
    importRecipesAtomicallyMock.mockResolvedValue({
      importedRecordIndexes: [2],
      existingDuplicateRecordIndexes: [0],
    });

    const result = await importRecipes({
      recipes: [
        recipe('Existing'),
        recipe(' existing '),
        recipe('New Recipe'),
      ],
    });

    expect(result).toEqual({
      received: 3,
      imported: 1,
      skippedDuplicates: 2,
      duplicates: [
        { recordIndex: 0, name: 'Existing', reason: 'EXISTING_RECIPE' },
        {
          recordIndex: 1,
          name: 'existing',
          reason: 'DUPLICATE_IN_PAYLOAD',
        },
      ],
    });
  });

  it('reports an all-existing repeated import as idempotent success', async () => {
    importRecipesAtomicallyMock.mockResolvedValue({
      importedRecordIndexes: [],
      existingDuplicateRecordIndexes: [0, 1],
    });

    await expect(
      importRecipes({ recipes: [recipe('Recipe A'), recipe('Recipe B')] }),
    ).resolves.toMatchObject({
      received: 2,
      imported: 0,
      skippedDuplicates: 2,
    });
  });

  it('rejects structural errors before ingredient lookup or writes', async () => {
    await expect(
      importRecipes({ recipes: [{ name: 'Incomplete' }] }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: expect.objectContaining({ totalErrors: expect.any(Number) }),
    });
    expect(lookupIngredientsMock).not.toHaveBeenCalled();
    expect(importRecipesAtomicallyMock).not.toHaveBeenCalled();
  });

  it('propagates transaction failures without returning partial success', async () => {
    const failure = new Error('private database failure');
    importRecipesAtomicallyMock.mockRejectedValue(failure);

    await expect(
      importRecipes({ recipes: [recipe('Recipe A')] }),
    ).rejects.toBe(failure);
  });
});
