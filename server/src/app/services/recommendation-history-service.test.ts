import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findRecommendationHistoryForUserMock } = vi.hoisted(() => ({
  findRecommendationHistoryForUserMock: vi.fn(),
}));

vi.mock('../repositories/recommendation-history-repository.js', () => ({
  findRecommendationHistoryForUser:
    findRecommendationHistoryForUserMock,
}));

import { getRecommendationHistory } from './recommendation-history-service.js';

const storedRecord = {
  id: 'history-1',
  inputIngredients: ['tomato', 'garbanzo bean'],
  filters: { limit: 5 },
  results: {
    recognizedIngredients: ['tomato', 'chickpea'],
    unknownIngredients: ['mystery item'],
    recipeIds: ['recipe-2', 'recipe-1'],
  },
  createdAt: new Date('2026-08-11T08:00:00.000Z'),
};

beforeEach(() => {
  vi.resetAllMocks();
  findRecommendationHistoryForUserMock.mockResolvedValue([]);
});

describe('getRecommendationHistory', () => {
  it('passes the authenticated user ID to the repository', async () => {
    await getRecommendationHistory('user-1');

    expect(findRecommendationHistoryForUserMock).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('maps stored JSON to the public history contract without recipe IDs', async () => {
    findRecommendationHistoryForUserMock.mockResolvedValue([storedRecord]);

    await expect(getRecommendationHistory('user-1')).resolves.toEqual([
      {
        id: 'history-1',
        ingredients: ['tomato', 'garbanzo bean'],
        recognizedIngredients: ['tomato', 'chickpea'],
        unknownIngredients: ['mystery item'],
        resultCount: 2,
        limit: 5,
        createdAt: '2026-08-11T08:00:00.000Z',
      },
    ]);
  });

  it('maps stored recommendation filters without duplicating the limit', async () => {
    findRecommendationHistoryForUserMock.mockResolvedValue([
      {
        ...storedRecord,
        filters: {
          limit: 10,
          cuisine: 'Mediterranean-inspired',
          maxPreparationTime: 30,
          dietaryType: 'vegan',
          excludeAllergens: ['peanut', 'soy'],
        },
      },
    ]);

    await expect(getRecommendationHistory('user-1')).resolves.toEqual([
      expect.objectContaining({
        limit: 10,
        filters: {
          cuisine: 'Mediterranean-inspired',
          maxPreparationTime: 30,
          dietaryType: 'vegan',
          excludeAllergens: ['peanut', 'soy'],
        },
      }),
    ]);
  });

  it('omits public filters for stored empty allergen selections', async () => {
    findRecommendationHistoryForUserMock.mockResolvedValue([
      { ...storedRecord, filters: { limit: 5, excludeAllergens: [] } },
    ]);

    const [entry] = await getRecommendationHistory('user-1');

    expect(entry).not.toHaveProperty('filters');
  });

  it('preserves repository order', async () => {
    findRecommendationHistoryForUserMock.mockResolvedValue([
      { ...storedRecord, id: 'newest' },
      { ...storedRecord, id: 'older' },
    ]);

    const result = await getRecommendationHistory('user-1');

    expect(result.map(({ id }) => id)).toEqual(['newest', 'older']);
  });

  it.each([
    ['inputIngredients', { inputIngredients: 'tomato' }],
    ['filters.limit', { filters: { limit: '5' } }],
    [
      'recognizedIngredients',
      { results: { ...storedRecord.results, recognizedIngredients: null } },
    ],
    [
      'unknownIngredients',
      { results: { ...storedRecord.results, unknownIngredients: [1] } },
    ],
    [
      'recipeIds',
      { results: { ...storedRecord.results, recipeIds: 'recipe-1' } },
    ],
  ])('fails safely for malformed stored %s JSON', async (_field, override) => {
    findRecommendationHistoryForUserMock.mockResolvedValue([
      { ...storedRecord, ...override },
    ]);

    await expect(getRecommendationHistory('user-1')).rejects.toMatchObject({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  });

  it('propagates repository failures', async () => {
    const error = new Error('database failure');
    findRecommendationHistoryForUserMock.mockRejectedValue(error);

    await expect(getRecommendationHistory('user-1')).rejects.toBe(error);
  });
});
