export interface RecommendationIngredient {
  id: string;
  name: string;
}

export interface RecommendationRecipeSummary {
  id: string;
  name: string;
  description: string | null;
  cuisine: string | null;
  preparationTime: number | null;
  servings: number | null;
  imageUrl: string | null;
  dietTags: string[];
  allergens: string[];
}

export interface RecommendationResult {
  recipe: RecommendationRecipeSummary;
  score: number;
  distance: number;
  matchPercentage: number;
  matchedIngredients: RecommendationIngredient[];
  missingIngredients: RecommendationIngredient[];
}

export interface RecommendationRequest {
  ingredients: string[];
  limit: number;
}

export interface RecommendationResponse {
  data: {
    recognizedIngredients: RecommendationIngredient[];
    unknownIngredients: string[];
    recommendations: RecommendationResult[];
  };
}
