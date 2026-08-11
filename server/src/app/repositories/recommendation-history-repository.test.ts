import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createMock, findManyMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock('../../database/prisma.js', () => ({
  prisma: {
    recommendationHistory: {
      create: createMock,
      findMany: findManyMock,
    },
  },
}));

import {
  createRecommendationHistory,
  findRecommendationHistoryForUser,
} from './recommendation-history-repository.js';

const selectedFields = {
  id: true,
  inputIngredients: true,
  filters: true,
  results: true,
  createdAt: true,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('createRecommendationHistory', () => {
  it('creates exactly the private search data supplied by the service', async () => {
    const input = {
      userId: 'user-1',
      inputIngredients: ['tomato', 'garbanzo bean'],
      filters: { limit: 5 },
      results: {
        recognizedIngredients: ['tomato', 'chickpea'],
        unknownIngredients: [],
        recipeIds: ['recipe-2', 'recipe-1'],
      },
    };
    const record = {
      id: 'history-1',
      ...input,
      createdAt: new Date('2026-08-11T08:00:00.000Z'),
    };
    createMock.mockResolvedValue(record);

    await expect(createRecommendationHistory(input)).resolves.toEqual(record);
    expect(createMock).toHaveBeenCalledWith({
      data: input,
      select: selectedFields,
    });
  });

  it('propagates database errors', async () => {
    const error = new Error('database failure');
    createMock.mockRejectedValue(error);

    await expect(
      createRecommendationHistory({
        userId: 'user-1',
        inputIngredients: ['tomato'],
        filters: { limit: 5 },
        results: {
          recognizedIngredients: ['tomato'],
          unknownIngredients: [],
          recipeIds: [],
        },
      }),
    ).rejects.toBe(error);
  });
});

describe('findRecommendationHistoryForUser', () => {
  it('uses one user-scoped latest-50 query with deterministic ordering', async () => {
    findManyMock.mockResolvedValue([]);

    await findRecommendationHistoryForUser('user-1');

    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
      select: selectedFields,
    });
  });

  it('returns persisted records without rewriting their order', async () => {
    const records = [{ id: 'history-2' }, { id: 'history-1' }];
    findManyMock.mockResolvedValue(records);

    await expect(
      findRecommendationHistoryForUser('user-1'),
    ).resolves.toBe(records);
  });

  it('propagates database errors', async () => {
    const error = new Error('database failure');
    findManyMock.mockRejectedValue(error);

    await expect(
      findRecommendationHistoryForUser('user-1'),
    ).rejects.toBe(error);
  });
});
