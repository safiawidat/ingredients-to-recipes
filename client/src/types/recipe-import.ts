import type { IngredientCategory } from './recipe';

export interface RecipeImportIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: IngredientCategory;
}

export interface RecipeImportRecipe {
  name: string;
  description: string | null;
  instructions: string;
  cuisine: string | null;
  preparationTime: number | null;
  servings: number | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  dietTags: string[];
  allergens: string[];
  isPublished: boolean;
  ingredients: RecipeImportIngredient[];
}

export interface RecipeImportRequest {
  recipes: RecipeImportRecipe[];
}

export type RecipeImportDuplicateReason =
  | 'EXISTING_RECIPE'
  | 'DUPLICATE_IN_PAYLOAD';

export interface RecipeImportDuplicate {
  recordIndex: number;
  name: string;
  reason: RecipeImportDuplicateReason;
}

export interface RecipeImportSummary {
  received: number;
  imported: number;
  skippedDuplicates: number;
  duplicates: RecipeImportDuplicate[];
}

export interface RecipeImportResponse {
  data: RecipeImportSummary;
}

export interface RecipeImportRecordError {
  recordIndex: number | null;
  recipeName: string | null;
  path: string;
  code: string;
  message: string;
}

export interface RecipeImportErrorDetails {
  recordErrors: RecipeImportRecordError[];
  totalErrors: number;
  errorsTruncated: boolean;
  unknownIngredients?: string[];
  totalUnknownIngredients?: number;
  unknownIngredientsTruncated?: boolean;
}
