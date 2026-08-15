import { z } from 'zod';

import { ApplicationError } from '../errors/application-error.js';
import {
  findRecommendationHistoryForUser,
  type RecommendationHistoryRecord,
} from '../repositories/recommendation-history-repository.js';
import {
  recommendationFiltersSchema,
  type RecommendationFilters,
} from '../validation/recommendation-schemas.js';

const storedHistoryFiltersSchema = recommendationFiltersSchema.extend({
  limit: z.number().int().min(1).max(20),
});

const storedHistorySchema = z.object({
  inputIngredients: z.array(z.string()),
  filters: storedHistoryFiltersSchema,
  results: z.object({
    recognizedIngredients: z.array(z.string()),
    unknownIngredients: z.array(z.string()),
    recipeIds: z.array(z.string()),
  }),
});

export interface RecommendationHistoryEntry {
  id: string;
  ingredients: string[];
  recognizedIngredients: string[];
  unknownIngredients: string[];
  resultCount: number;
  limit: number;
  filters?: RecommendationFilters;
  createdAt: string;
}

const hasActiveFilters = (filters: RecommendationFilters): boolean =>
  filters.cuisine !== undefined ||
  filters.maxPreparationTime !== undefined ||
  filters.dietaryType !== undefined ||
  (filters.excludeAllergens !== undefined &&
    filters.excludeAllergens.length > 0);

const invalidStoredHistoryError = (): ApplicationError =>
  new ApplicationError(
    500,
    'INTERNAL_SERVER_ERROR',
    'An unexpected error occurred',
  );

const mapHistoryRecord = (
  record: RecommendationHistoryRecord,
): RecommendationHistoryEntry => {
  const storedHistory = storedHistorySchema.safeParse({
    inputIngredients: record.inputIngredients,
    filters: record.filters,
    results: record.results,
  });

  if (!storedHistory.success) {
    throw invalidStoredHistoryError();
  }

  const { limit, ...filters } = storedHistory.data.filters;

  return {
    id: record.id,
    ingredients: storedHistory.data.inputIngredients,
    recognizedIngredients:
      storedHistory.data.results.recognizedIngredients,
    unknownIngredients: storedHistory.data.results.unknownIngredients,
    resultCount: storedHistory.data.results.recipeIds.length,
    limit,
    ...(hasActiveFilters(filters) ? { filters } : {}),
    createdAt: record.createdAt.toISOString(),
  };
};

export const getRecommendationHistory = async (
  userId: string,
): Promise<RecommendationHistoryEntry[]> => {
  const records = await findRecommendationHistoryForUser(userId);

  return records.map(mapHistoryRecord);
};
