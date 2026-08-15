import { prisma } from '../../database/prisma.js';
import type { RecommendationFilters } from '../validation/recommendation-schemas.js';

export interface RecommendationHistoryFilters extends RecommendationFilters {
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

const toStoredFilters = ({
  limit,
  cuisine,
  maxPreparationTime,
  dietaryType,
  excludeAllergens,
}: RecommendationHistoryFilters) => ({
  limit,
  ...(cuisine !== undefined ? { cuisine } : {}),
  ...(maxPreparationTime !== undefined ? { maxPreparationTime } : {}),
  ...(dietaryType !== undefined ? { dietaryType } : {}),
  ...(excludeAllergens !== undefined && excludeAllergens.length > 0
    ? { excludeAllergens }
    : {}),
});

export const createRecommendationHistory = async (
  input: CreateRecommendationHistoryInput,
): Promise<RecommendationHistoryRecord> =>
  prisma.recommendationHistory.create({
    data: {
      userId: input.userId,
      inputIngredients: input.inputIngredients,
      filters: toStoredFilters(input.filters),
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
