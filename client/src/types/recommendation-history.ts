export interface RecommendationHistoryEntry {
  id: string;
  ingredients: string[];
  recognizedIngredients: string[];
  unknownIngredients: string[];
  resultCount: number;
  limit: number;
  createdAt: string;
}

export interface RecommendationHistoryResponse {
  data: {
    history: RecommendationHistoryEntry[];
  };
}
