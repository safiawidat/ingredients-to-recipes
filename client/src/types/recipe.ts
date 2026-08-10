export const ingredientCategories = ['MAIN', 'SIDE', 'OTHER'] as const;

export type IngredientCategory = (typeof ingredientCategories)[number];

export interface RecipeSummary {
  id: string;
  name: string;
  description: string | null;
  cuisine: string | null;
  preparationTime: number | null;
  servings: number | null;
  imageUrl: string | null;
  dietTags: string[];
  allergens: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeIngredient {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number | null;
  unit: string | null;
  category: IngredientCategory;
}

export interface RecipeDetail extends RecipeSummary {
  instructions: string;
  sourceUrl: string | null;
  ingredients: RecipeIngredient[];
}

export interface RecipePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RecipeListResponse {
  data: {
    recipes: RecipeSummary[];
    pagination: RecipePagination;
  };
}

export interface RecipeResponse {
  data: {
    recipe: RecipeDetail;
  };
}

export interface RecipeListParams {
  page?: number;
  pageSize?: number;
}

export interface RecipeIngredientInput {
  ingredientId: string;
  quantity?: number;
  unit?: string;
  category?: IngredientCategory;
}

export interface CreateRecipeInput {
  name: string;
  description?: string | null;
  instructions: string;
  cuisine?: string | null;
  preparationTime?: number | null;
  servings?: number | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  dietTags?: string[];
  allergens?: string[];
  isPublished?: boolean;
  ingredients: RecipeIngredientInput[];
}

type RecipeUpdateFields = Omit<CreateRecipeInput, 'ingredients'> & {
  ingredients: RecipeIngredientInput[];
};

type AtLeastOne<T> = {
  [Key in keyof T]: Required<Pick<T, Key>> & Partial<Omit<T, Key>>;
}[keyof T];

export type UpdateRecipeInput = AtLeastOne<RecipeUpdateFields>;
