import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createManyAndReturnMock,
  createManyRelationshipMock,
  findManyRecipeMock,
  transactionMock,
} = vi.hoisted(() => ({
  createManyAndReturnMock: vi.fn(),
  createManyRelationshipMock: vi.fn(),
  findManyRecipeMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock('../../database/prisma.js', () => ({
  prisma: {
    $transaction: transactionMock,
  },
}));

import {
  importRecipesAtomically,
  type PreparedRecipeImportRecord,
} from './recipe-import-repository.js';

const transactionClient = {
  recipe: {
    findMany: findManyRecipeMock,
    createManyAndReturn: createManyAndReturnMock,
  },
  recipeIngredient: {
    createMany: createManyRelationshipMock,
  },
};

const recipe = (
  recordIndex: number,
  name: string,
  ingredientId = `ingredient-${recordIndex}`,
): PreparedRecipeImportRecord => ({
  recordIndex,
  duplicateKey: name.toLowerCase(),
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
  ingredients: [
    {
      ingredientId,
      quantity: null,
      unit: null,
      category: 'MAIN',
    },
  ],
});

const toDuplicateKey = (name: string): string => name.trim().toLowerCase();

beforeEach(() => {
  vi.resetAllMocks();
  transactionMock.mockImplementation(
    (operation: (client: typeof transactionClient) => unknown) =>
      operation(transactionClient),
  );
  findManyRecipeMock.mockResolvedValue([]);
  createManyRelationshipMock.mockResolvedValue({ count: 0 });
});

describe('importRecipesAtomically', () => {
  it('reads existing names and skips matching records in the transaction', async () => {
    findManyRecipeMock.mockResolvedValue([{ name: 'Existing Soup' }]);
    createManyAndReturnMock.mockResolvedValue([
      { id: 'recipe-new', name: 'New Soup' },
    ]);

    const result = await importRecipesAtomically(
      [recipe(0, 'Existing Soup'), recipe(1, 'New Soup')],
      toDuplicateKey,
    );

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(findManyRecipeMock).toHaveBeenCalledWith({
      select: { name: true },
    });
    expect(result).toEqual({
      importedRecordIndexes: [1],
      existingDuplicateRecordIndexes: [0],
    });
  });

  it('bulk-creates recipes and maps returned IDs by name for relation creation', async () => {
    createManyAndReturnMock.mockResolvedValue([
      { id: 'recipe-b', name: 'Soup B' },
      { id: 'recipe-a', name: 'Soup A' },
    ]);

    await importRecipesAtomically(
      [recipe(0, 'Soup A', 'ingredient-a'), recipe(1, 'Soup B', 'ingredient-b')],
      toDuplicateKey,
    );

    expect(createManyAndReturnMock).toHaveBeenCalledTimes(1);
    expect(createManyAndReturnMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ name: 'Soup A' }),
        expect.objectContaining({ name: 'Soup B' }),
      ],
      select: { id: true, name: true },
    });
    expect(createManyRelationshipMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          recipeId: 'recipe-a',
          ingredientId: 'ingredient-a',
        }),
        expect.objectContaining({
          recipeId: 'recipe-b',
          ingredientId: 'ingredient-b',
        }),
      ],
    });
  });

  it('does not issue write queries when every recipe already exists', async () => {
    findManyRecipeMock.mockResolvedValue([{ name: 'Existing Soup' }]);

    await expect(
      importRecipesAtomically([recipe(0, 'existing soup')], toDuplicateKey),
    ).resolves.toEqual({
      importedRecordIndexes: [],
      existingDuplicateRecordIndexes: [0],
    });
    expect(createManyAndReturnMock).not.toHaveBeenCalled();
    expect(createManyRelationshipMock).not.toHaveBeenCalled();
  });

  it('propagates transaction failures without retrying partial work', async () => {
    const failure = new Error('private database failure');
    createManyAndReturnMock.mockRejectedValue(failure);

    await expect(
      importRecipesAtomically([recipe(0, 'New Soup')], toDuplicateKey),
    ).rejects.toBe(failure);
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(createManyRelationshipMock).not.toHaveBeenCalled();
  });
});
