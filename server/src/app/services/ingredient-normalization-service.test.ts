import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findManyIngredientMock, findManyIngredientAliasMock } = vi.hoisted(
  () => ({
    findManyIngredientMock: vi.fn(),
    findManyIngredientAliasMock: vi.fn(),
  }),
);

vi.mock('../../database/prisma.js', () => ({
  prisma: {
    ingredient: {
      findMany: findManyIngredientMock,
    },
    ingredientAlias: {
      findMany: findManyIngredientAliasMock,
    },
  },
}));

import { normalizeAndResolveIngredients } from './ingredient-normalization-service.js';

const tomato = { id: 'ingredient-1', name: 'tomato' };
const greenOnion = { id: 'ingredient-2', name: 'green onion' };

beforeEach(() => {
  vi.resetAllMocks();
});

describe('normalizeAndResolveIngredients', () => {
  it('resolves a canonical ingredient', async () => {
    findManyIngredientMock.mockResolvedValue([tomato]);
    findManyIngredientAliasMock.mockResolvedValue([]);

    const result = await normalizeAndResolveIngredients(['Tomato']);

    expect(result).toEqual([
      {
        normalizedInput: 'tomato',
        status: 'canonical',
        ingredientId: 'ingredient-1',
        canonicalName: 'tomato',
      },
    ]);
  });

  it('resolves an ingredient through an alias', async () => {
    findManyIngredientMock.mockResolvedValue([]);
    findManyIngredientAliasMock.mockResolvedValue([
      { alias: 'scallion', ingredient: greenOnion },
    ]);

    const result = await normalizeAndResolveIngredients(['Scallion']);

    expect(result).toEqual([
      {
        normalizedInput: 'scallion',
        status: 'alias',
        ingredientId: 'ingredient-2',
        canonicalName: 'green onion',
      },
    ]);
  });

  it('marks unknown ingredients as unresolved', async () => {
    findManyIngredientMock.mockResolvedValue([]);
    findManyIngredientAliasMock.mockResolvedValue([]);

    const result = await normalizeAndResolveIngredients(['Zuchini']);

    expect(result).toEqual([
      {
        normalizedInput: 'zuchini',
        status: 'unresolved',
        ingredientId: null,
        canonicalName: null,
      },
    ]);
  });

  it('classifies mixed canonical, alias, and unresolved inputs deterministically', async () => {
    findManyIngredientMock.mockResolvedValue([tomato]);
    findManyIngredientAliasMock.mockResolvedValue([
      { alias: 'scallion', ingredient: greenOnion },
    ]);

    const result = await normalizeAndResolveIngredients([
      'Tomato',
      'Scallion',
      'Zuchini',
    ]);

    expect(result).toEqual([
      {
        normalizedInput: 'tomato',
        status: 'canonical',
        ingredientId: 'ingredient-1',
        canonicalName: 'tomato',
      },
      {
        normalizedInput: 'scallion',
        status: 'alias',
        ingredientId: 'ingredient-2',
        canonicalName: 'green onion',
      },
      {
        normalizedInput: 'zuchini',
        status: 'unresolved',
        ingredientId: null,
        canonicalName: null,
      },
    ]);
  });

  it('collapses duplicate raw inputs into a single resolution', async () => {
    findManyIngredientMock.mockResolvedValue([tomato]);
    findManyIngredientAliasMock.mockResolvedValue([]);

    const result = await normalizeAndResolveIngredients([
      'Tomato',
      ' tomato ',
      'TOMATO',
    ]);

    expect(result).toEqual([
      {
        normalizedInput: 'tomato',
        status: 'canonical',
        ingredientId: 'ingredient-1',
        canonicalName: 'tomato',
      },
    ]);
  });

  it('produces deterministic output for the same input', async () => {
    findManyIngredientMock.mockResolvedValue([tomato]);
    findManyIngredientAliasMock.mockResolvedValue([
      { alias: 'scallion', ingredient: greenOnion },
    ]);

    const input = ['Scallion', 'Tomato', 'Zuchini'];

    const firstResult = await normalizeAndResolveIngredients(input);
    const secondResult = await normalizeAndResolveIngredients(input);

    expect(firstResult).toEqual(secondResult);
  });

  it('does not mutate the input array', async () => {
    findManyIngredientMock.mockResolvedValue([]);
    findManyIngredientAliasMock.mockResolvedValue([]);

    const input = ['Tomato', ' Onion '];
    const inputCopy = [...input];

    await normalizeAndResolveIngredients(input);

    expect(input).toEqual(inputCopy);
  });

  it('rejects invalid empty input before attempting any lookup', async () => {
    await expect(normalizeAndResolveIngredients([''])).rejects.toThrow(
      'At least one non-empty ingredient is required',
    );

    expect(findManyIngredientMock).not.toHaveBeenCalled();
    expect(findManyIngredientAliasMock).not.toHaveBeenCalled();
  });

  it('propagates lookup failures instead of swallowing them', async () => {
    const lookupError = new Error('Database connection lost');
    findManyIngredientMock.mockRejectedValue(lookupError);
    findManyIngredientAliasMock.mockResolvedValue([]);

    await expect(normalizeAndResolveIngredients(['Tomato'])).rejects.toBe(
      lookupError,
    );
  });
});
