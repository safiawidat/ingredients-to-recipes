import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findManyIngredientMock,
  findManyIngredientAliasMock,
  findUniqueIngredientMock,
  findUniqueIngredientAliasMock,
} = vi.hoisted(() => ({
  findManyIngredientMock: vi.fn(),
  findManyIngredientAliasMock: vi.fn(),
  findUniqueIngredientMock: vi.fn(),
  findUniqueIngredientAliasMock: vi.fn(),
}));

vi.mock('../../database/prisma.js', () => ({
  prisma: {
    ingredient: {
      findUnique: findUniqueIngredientMock,
      findMany: findManyIngredientMock,
    },
    ingredientAlias: {
      findUnique: findUniqueIngredientAliasMock,
      findMany: findManyIngredientAliasMock,
    },
  },
}));

import {
  findIngredientByNormalizedAlias,
  findIngredientByNormalizedName,
  findIngredientsByNormalizedValues,
} from './ingredient-lookup-service.js';

const tomato = { id: 'ingredient-1', name: 'tomato' };
const greenOnion = { id: 'ingredient-2', name: 'green onion' };

beforeEach(() => {
  vi.resetAllMocks();
});

describe('findIngredientByNormalizedName', () => {
  it('resolves a canonical ingredient by its normalized name', async () => {
    findUniqueIngredientMock.mockResolvedValue(tomato);

    const result = await findIngredientByNormalizedName('tomato');

    expect(findUniqueIngredientMock).toHaveBeenCalledWith({
      where: { name: 'tomato' },
      select: { id: true, name: true },
    });
    expect(result).toEqual(tomato);
  });

  it('returns null for an unknown name instead of throwing', async () => {
    findUniqueIngredientMock.mockResolvedValue(null);

    await expect(
      findIngredientByNormalizedName('unknown'),
    ).resolves.toBeNull();
  });
});

describe('findIngredientByNormalizedAlias', () => {
  it('resolves an alias to its canonical ingredient', async () => {
    findUniqueIngredientAliasMock.mockResolvedValue({ ingredient: tomato });

    const result = await findIngredientByNormalizedAlias('love apple');

    expect(findUniqueIngredientAliasMock).toHaveBeenCalledWith({
      where: { alias: 'love apple' },
      select: { ingredient: { select: { id: true, name: true } } },
    });
    expect(result).toEqual(tomato);
  });

  it('returns null for an unknown alias instead of throwing', async () => {
    findUniqueIngredientAliasMock.mockResolvedValue(null);

    await expect(
      findIngredientByNormalizedAlias('unknown'),
    ).resolves.toBeNull();
  });
});

describe('findIngredientsByNormalizedValues', () => {
  it('resolves multiple inputs from canonical names and aliases in one batch', async () => {
    findManyIngredientMock.mockResolvedValue([tomato]);
    findManyIngredientAliasMock.mockResolvedValue([
      { alias: 'love apple', ingredient: tomato },
      { alias: 'scallion', ingredient: greenOnion },
    ]);

    const result = await findIngredientsByNormalizedValues([
      'tomato',
      'love apple',
      'scallion',
      'unknown',
    ]);

    expect(findManyIngredientMock).toHaveBeenCalledTimes(1);
    expect(findManyIngredientAliasMock).toHaveBeenCalledTimes(1);
    expect(findManyIngredientMock).toHaveBeenCalledWith({
      where: { name: { in: ['tomato', 'love apple', 'scallion', 'unknown'] } },
      select: { id: true, name: true },
    });
    expect(findManyIngredientAliasMock).toHaveBeenCalledWith({
      where: {
        alias: { in: ['tomato', 'love apple', 'scallion', 'unknown'] },
      },
      select: {
        alias: true,
        ingredient: { select: { id: true, name: true } },
      },
    });
    expect(result).toEqual(
      new Map([
        ['tomato', tomato],
        ['love apple', tomato],
        ['scallion', greenOnion],
        ['unknown', null],
      ]),
    );
  });

  it('returns no match for unknown values without throwing', async () => {
    findManyIngredientMock.mockResolvedValue([]);
    findManyIngredientAliasMock.mockResolvedValue([]);

    const result = await findIngredientsByNormalizedValues(['unknown']);

    expect(result).toEqual(new Map([['unknown', null]]));
  });

  it('does not distort results for duplicate query inputs', async () => {
    findManyIngredientMock.mockResolvedValue([tomato]);
    findManyIngredientAliasMock.mockResolvedValue([]);

    const result = await findIngredientsByNormalizedValues([
      'tomato',
      'tomato',
      'tomato',
    ]);

    expect(result).toEqual(new Map([['tomato', tomato]]));
    expect(result.size).toBe(1);
  });

  it('produces deterministic output for the same input', async () => {
    findManyIngredientMock.mockResolvedValue([tomato]);
    findManyIngredientAliasMock.mockResolvedValue([
      { alias: 'scallion', ingredient: greenOnion },
    ]);

    const input = ['scallion', 'tomato', 'unknown'];

    const firstResult = await findIngredientsByNormalizedValues(input);
    const secondResult = await findIngredientsByNormalizedValues(input);

    expect([...firstResult.entries()]).toEqual([...secondResult.entries()]);
  });
});
