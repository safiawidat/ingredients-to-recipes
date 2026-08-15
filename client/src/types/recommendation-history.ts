import type { RecommendationFilters } from './recommendation';

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

export interface RecommendationHistoryResponse {
  data: {
    history: RecommendationHistoryEntry[];
  };
}
