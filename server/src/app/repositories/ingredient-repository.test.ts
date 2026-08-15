import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findManyIngredientMock } = vi.hoisted(() => ({
  findManyIngredientMock: vi.fn(),
}));

vi.mock('../../database/prisma.js', () => ({
  prisma: {
    ingredient: {
      findMany: findManyIngredientMock,
    },
  },
}));

import {
  findIngredientsByIds,
  listIngredients,
} from './ingredient-repository.js';

const tomato = { id: 'ingredient-1', name: 'tomato' };
const greenOnion = { id: 'ingredient-2', name: 'green onion' };

beforeEach(() => {
  vi.resetAllMocks();
});

describe('listIngredients', () => {
  it('selects only canonical ingredient fields in alphabetical order', async () => {
    findManyIngredientMock.mockResolvedValue([greenOnion, tomato]);

    const result = await listIngredients();

    expect(findManyIngredientMock).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    expect(result).toEqual([greenOnion, tomato]);
  });

  it('returns an empty array when there are no ingredients', async () => {
    findManyIngredientMock.mockResolvedValue([]);

    await expect(listIngredients()).resolves.toEqual([]);
  });
});

describe('findIngredientsByIds', () => {
  it('resolves multiple ids to their ingredient records in one batch', async () => {
    findManyIngredientMock.mockResolvedValue([tomato, greenOnion]);

    const result = await findIngredientsByIds([
      'ingredient-1',
      'ingredient-2',
    ]);

    expect(findManyIngredientMock).toHaveBeenCalledTimes(1);
    expect(findManyIngredientMock).toHaveBeenCalledWith({
      where: { id: { in: ['ingredient-1', 'ingredient-2'] } },
      select: { id: true, name: true },
    });
    expect(result).toEqual(
      new Map([
        ['ingredient-1', tomato],
        ['ingredient-2', greenOnion],
      ]),
    );
  });

  it('returns null for unknown ids without throwing', async () => {
    findManyIngredientMock.mockResolvedValue([]);

    const result = await findIngredientsByIds(['missing-ingredient']);

    expect(result).toEqual(new Map([['missing-ingredient', null]]));
  });

  it('does not distort results for duplicate ids', async () => {
    findManyIngredientMock.mockResolvedValue([tomato]);

    const result = await findIngredientsByIds([
      'ingredient-1',
      'ingredient-1',
    ]);

    expect(result).toEqual(new Map([['ingredient-1', tomato]]));
    expect(result.size).toBe(1);
  });

  it('produces deterministic output for the same input', async () => {
    findManyIngredientMock.mockResolvedValue([tomato, greenOnion]);

    const input = ['ingredient-2', 'ingredient-1', 'missing-ingredient'];

    const firstResult = await findIngredientsByIds(input);
    const secondResult = await findIngredientsByIds(input);

    expect([...firstResult.entries()]).toEqual([...secondResult.entries()]);
  });

  it('handles a mix of known and unknown ids in one call', async () => {
    findManyIngredientMock.mockResolvedValue([tomato]);

    const result = await findIngredientsByIds([
      'ingredient-1',
      'missing-ingredient',
    ]);

    expect(result).toEqual(
      new Map([
        ['ingredient-1', tomato],
        ['missing-ingredient', null],
      ]),
    );
  });
});
