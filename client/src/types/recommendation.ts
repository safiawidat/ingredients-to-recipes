export const recommendationCuisineOptions = [
  'Mediterranean-inspired',
  'Home-style',
  'General',
  'Italian-inspired',
  'Asian-inspired',
  'Middle Eastern-inspired',
  'Mexican-inspired',
] as const;

export const recommendationDietaryOptions = [
  'vegan',
  'vegetarian',
  'dairy-free',
  'gluten-free',
] as const;

export const recommendationAllergenOptions = [
  'dairy',
  'egg',
  'fish',
  'gluten',
  'peanut',
  'sesame',
  'soy',
  'tree-nut',
] as const;

export type RecommendationCuisine =
  (typeof recommendationCuisineOptions)[number];
export type RecommendationDietaryType =
  (typeof recommendationDietaryOptions)[number];
export type RecommendationAllergen =
  (typeof recommendationAllergenOptions)[number];

export interface RecommendationFilters {
  cuisine?: RecommendationCuisine;
  maxPreparationTime?: number;
  dietaryType?: RecommendationDietaryType;
  excludeAllergens?: RecommendationAllergen[];
}

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
  filters?: RecommendationFilters;
}

export interface RecommendationResponse {
  data: {
    recognizedIngredients: RecommendationIngredient[];
    unknownIngredients: string[];
    recommendations: RecommendationResult[];
  };
}
