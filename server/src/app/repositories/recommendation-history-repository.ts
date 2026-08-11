import { prisma } from '../../database/prisma.js';

export interface RecommendationHistoryFilters {
  limit: number;
}

export interface RecommendationHistoryResults {
  recognizedIngredients: string[];
  unknownIngredients: string[];
  recipeIds: string[];
}

export interface CreateRecommendationHistoryInput {
  userId: string;
  inputIngredients: string[];
  filters: RecommendationHistoryFilters;
  results: RecommendationHistoryResults;
}

export interface RecommendationHistoryRecord {
  id: string;
  inputIngredients: unknown;
  filters: unknown;
  results: unknown;
  createdAt: Date;
}

const historyRecordSelect = {
  id: true,
  inputIngredients: true,
  filters: true,
  results: true,
  createdAt: true,
} as const;

export const createRecommendationHistory = async (
  input: CreateRecommendationHistoryInput,
): Promise<RecommendationHistoryRecord> =>
  prisma.recommendationHistory.create({
    data: {
      userId: input.userId,
      inputIngredients: input.inputIngredients,
      filters: { limit: input.filters.limit },
      results: {
        recognizedIngredients: input.results.recognizedIngredients,
        unknownIngredients: input.results.unknownIngredients,
        recipeIds: input.results.recipeIds,
      },
    },
    select: historyRecordSelect,
  });

export const findRecommendationHistoryForUser = (
  userId: string,
): Promise<RecommendationHistoryRecord[]> =>
  prisma.recommendationHistory.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50,
    select: historyRecordSelect,
  });
