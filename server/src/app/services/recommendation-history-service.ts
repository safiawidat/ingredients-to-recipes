import { z } from 'zod';

import { ApplicationError } from '../errors/application-error.js';
import {
  findRecommendationHistoryForUser,
  type RecommendationHistoryRecord,
} from '../repositories/recommendation-history-repository.js';

const storedHistorySchema = z.object({
  inputIngredients: z.array(z.string()),
  filters: z.object({
    limit: z.number().int().min(1).max(20),
  }),
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
  createdAt: string;
}

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

  return {
    id: record.id,
    ingredients: storedHistory.data.inputIngredients,
    recognizedIngredients:
      storedHistory.data.results.recognizedIngredients,
    unknownIngredients: storedHistory.data.results.unknownIngredients,
    resultCount: storedHistory.data.results.recipeIds.length,
    limit: storedHistory.data.filters.limit,
    createdAt: record.createdAt.toISOString(),
  };
};

export const getRecommendationHistory = async (
  userId: string,
): Promise<RecommendationHistoryEntry[]> => {
  const records = await findRecommendationHistoryForUser(userId);

  return records.map(mapHistoryRecord);
};
