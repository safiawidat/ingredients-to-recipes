import { UserRole } from '../../generated/prisma/enums.js';
import type { IngredientCategory } from '../../generated/prisma/enums.js';
import { ApplicationError } from '../errors/application-error.js';
import { findIngredientsByIds } from '../repositories/ingredient-repository.js';
import {
  createRecipe as createRecipeInRepository,
  findAllRecipes,
  findPublishedRecipes,
  findRecipeByIdForUser as findRecipeByIdForUserInRepository,
  updateRecipe as updateRecipeInRepository,
} from '../repositories/recipe-repository.js';
import type {
  CreateRecipeInput as RepositoryCreateRecipeInput,
  RecipeDetail,
  RecipeDetailForUser,
  RecipeIngredientDetail,
  RecipeIngredientInput as RepositoryRecipeIngredientInput,
  RecipeListParams as RepositoryRecipeListParams,
  RecipeListResult as RepositoryRecipeListResult,
  RecipeSummary,
  UpdateRecipeInput as RepositoryUpdateRecipeInput,
} from '../repositories/recipe-repository.js';

export interface RecipeIngredientInputDto {
  ingredientId: string;
  quantity?: number | undefined;
  unit?: string | undefined;
  category?: IngredientCategory | undefined;
}

export interface CreateRecipeServiceInput {
  name: string;
  description?: string | null | undefined;
  instructions: string;
  cuisine?: string | null | undefined;
  preparationTime?: number | null | undefined;
  servings?: number | null | undefined;
  imageUrl?: string | null | undefined;
  sourceUrl?: string | null | undefined;
  dietTags?: string[] | undefined;
  allergens?: string[] | undefined;
  isPublished?: boolean | undefined;
  ingredients: RecipeIngredientInputDto[];
}

export interface UpdateRecipeServiceInput {
  name?: string | undefined;
  description?: string | null | undefined;
  instructions?: string | undefined;
  cuisine?: string | null | undefined;
  preparationTime?: number | null | undefined;
  servings?: number | null | undefined;
  imageUrl?: string | null | undefined;
  sourceUrl?: string | null | undefined;
  dietTags?: string[] | undefined;
  allergens?: string[] | undefined;
  isPublished?: boolean | undefined;
  ingredients?: RecipeIngredientInputDto[] | undefined;
}

export interface ListRecipesInput {
  page: number;
  pageSize: number;
}

export interface RecipeSummaryDto {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeListDto {
  recipes: RecipeSummaryDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RecipeIngredientDto {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number | null;
  unit: string | null;
  category: IngredientCategory;
}

export interface RecipeDto {
  id: string;
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
  createdAt: Date;
  updatedAt: Date;
  ingredients: RecipeIngredientDto[];
}

export interface UserRecipeDto extends RecipeDto {
  isFavorite: boolean;
}

const recipeNotFoundError = (): ApplicationError =>
  new ApplicationError(
    404,
    'RECIPE_NOT_FOUND',
    'The specified recipe does not exist',
  );

const invalidPaginationError = (): ApplicationError =>
  new ApplicationError(
    400,
    'INVALID_PAGINATION',
    'Page and page size must be positive integers',
  );

const duplicateRecipeIngredientError = (): ApplicationError =>
  new ApplicationError(
    409,
    'DUPLICATE_RECIPE_INGREDIENT',
    'Recipe ingredients must not contain duplicate ingredient references',
  );

const ingredientNotFoundError = (): ApplicationError =>
  new ApplicationError(
    404,
    'INGREDIENT_NOT_FOUND',
    'One or more referenced ingredients do not exist',
  );

const isPositiveInteger = (value: number): boolean =>
  Number.isInteger(value) && value > 0;

const toRecipeSummaryDto = (recipe: RecipeSummary): RecipeSummaryDto => ({
  id: recipe.id,
  name: recipe.name,
  description: recipe.description,
  cuisine: recipe.cuisine,
  preparationTime: recipe.preparationTime,
  servings: recipe.servings,
  imageUrl: recipe.imageUrl,
  dietTags: recipe.dietTags,
  allergens: recipe.allergens,
  isPublished: recipe.isPublished,
  createdAt: recipe.createdAt,
  updatedAt: recipe.updatedAt,
});

const toRecipeIngredientDto = (
  ingredient: RecipeIngredientDetail,
): RecipeIngredientDto => ({
  id: ingredient.id,
  ingredientId: ingredient.ingredient.id,
  ingredientName: ingredient.ingredient.name,
  quantity: ingredient.quantity === null ? null : ingredient.quantity.toNumber(),
  unit: ingredient.unit,
  category: ingredient.category,
});

const toRecipeDto = (recipe: RecipeDetail): RecipeDto => ({
  id: recipe.id,
  name: recipe.name,
  description: recipe.description,
  instructions: recipe.instructions,
  cuisine: recipe.cuisine,
  preparationTime: recipe.preparationTime,
  servings: recipe.servings,
  imageUrl: recipe.imageUrl,
  sourceUrl: recipe.sourceUrl,
  dietTags: recipe.dietTags,
  allergens: recipe.allergens,
  isPublished: recipe.isPublished,
  createdAt: recipe.createdAt,
  updatedAt: recipe.updatedAt,
  ingredients: recipe.ingredients.map(toRecipeIngredientDto),
});

const toUserRecipeDto = (recipe: RecipeDetailForUser): UserRecipeDto => ({
  ...toRecipeDto(recipe),
  isFavorite: recipe.favorites.length > 0,
});

const toRepositoryIngredientInput = (
  ingredient: RecipeIngredientInputDto,
): RepositoryRecipeIngredientInput => ({
  ingredientId: ingredient.ingredientId,
  ...(ingredient.quantity !== undefined
    ? { quantity: ingredient.quantity }
    : {}),
  ...(ingredient.unit !== undefined ? { unit: ingredient.unit } : {}),
  ...(ingredient.category !== undefined
    ? { category: ingredient.category }
    : {}),
});

const toRepositoryCreateInput = (
  input: CreateRecipeServiceInput,
): RepositoryCreateRecipeInput => ({
  name: input.name,
  ...(input.description !== undefined
    ? { description: input.description }
    : {}),
  instructions: input.instructions,
  ...(input.cuisine !== undefined ? { cuisine: input.cuisine } : {}),
  ...(input.preparationTime !== undefined
    ? { preparationTime: input.preparationTime }
    : {}),
  ...(input.servings !== undefined ? { servings: input.servings } : {}),
  ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
  ...(input.sourceUrl !== undefined ? { sourceUrl: input.sourceUrl } : {}),
  ...(input.dietTags !== undefined ? { dietTags: input.dietTags } : {}),
  ...(input.allergens !== undefined ? { allergens: input.allergens } : {}),
  ...(input.isPublished !== undefined
    ? { isPublished: input.isPublished }
    : {}),
  ingredients: input.ingredients.map(toRepositoryIngredientInput),
});

const toRepositoryUpdateInput = (
  input: UpdateRecipeServiceInput,
): RepositoryUpdateRecipeInput => ({
  ...(input.name !== undefined ? { name: input.name } : {}),
  ...(input.description !== undefined
    ? { description: input.description }
    : {}),
  ...(input.instructions !== undefined
    ? { instructions: input.instructions }
    : {}),
  ...(input.cuisine !== undefined ? { cuisine: input.cuisine } : {}),
  ...(input.preparationTime !== undefined
    ? { preparationTime: input.preparationTime }
    : {}),
  ...(input.servings !== undefined ? { servings: input.servings } : {}),
  ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
  ...(input.sourceUrl !== undefined ? { sourceUrl: input.sourceUrl } : {}),
  ...(input.dietTags !== undefined ? { dietTags: input.dietTags } : {}),
  ...(input.allergens !== undefined ? { allergens: input.allergens } : {}),
  ...(input.isPublished !== undefined
    ? { isPublished: input.isPublished }
    : {}),
  ...(input.ingredients !== undefined
    ? { ingredients: input.ingredients.map(toRepositoryIngredientInput) }
    : {}),
});

const ensureNoDuplicateIngredientIds = (
  ingredients: RecipeIngredientInputDto[],
): void => {
  const ingredientIds = ingredients.map((ingredient) => ingredient.ingredientId);

  if (new Set(ingredientIds).size !== ingredientIds.length) {
    throw duplicateRecipeIngredientError();
  }
};

const ensureIngredientsExist = async (
  ingredients: RecipeIngredientInputDto[],
): Promise<void> => {
  if (ingredients.length === 0) {
    return;
  }

  const ingredientIds = ingredients.map((ingredient) => ingredient.ingredientId);
  const foundIngredients = await findIngredientsByIds(ingredientIds);
  const hasMissingIngredient = ingredientIds.some(
    (id) => foundIngredients.get(id) === null,
  );

  if (hasMissingIngredient) {
    throw ingredientNotFoundError();
  }
};

type FindRecipes = (
  params: RepositoryRecipeListParams,
) => Promise<RepositoryRecipeListResult>;

const listRecipes = async (
  input: ListRecipesInput,
  findRecipes: FindRecipes,
): Promise<RecipeListDto> => {
  if (!isPositiveInteger(input.page) || !isPositiveInteger(input.pageSize)) {
    throw invalidPaginationError();
  }

  const skip = (input.page - 1) * input.pageSize;
  const take = input.pageSize;

  const { recipes, total } = await findRecipes({ skip, take });

  return {
    recipes: recipes.map(toRecipeSummaryDto),
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.ceil(total / input.pageSize),
  };
};

export const listPublishedRecipes = (
  input: ListRecipesInput,
): Promise<RecipeListDto> => listRecipes(input, findPublishedRecipes);

export const listAllRecipes = (
  input: ListRecipesInput,
): Promise<RecipeListDto> => listRecipes(input, findAllRecipes);

export const getRecipeByIdForUser = async (
  id: string,
  userId: string,
  requesterRole: UserRole,
): Promise<UserRecipeDto> => {
  const recipe = await findRecipeByIdForUserInRepository(id, userId);

  if (!recipe || (!recipe.isPublished && requesterRole !== UserRole.ADMIN)) {
    throw recipeNotFoundError();
  }

  return toUserRecipeDto(recipe);
};

export const createRecipe = async (
  input: CreateRecipeServiceInput,
): Promise<RecipeDto> => {
  ensureNoDuplicateIngredientIds(input.ingredients);
  await ensureIngredientsExist(input.ingredients);

  const recipe = await createRecipeInRepository(
    toRepositoryCreateInput(input),
  );

  return toRecipeDto(recipe);
};

export const updateRecipe = async (
  id: string,
  input: UpdateRecipeServiceInput,
): Promise<RecipeDto> => {
  if (input.ingredients !== undefined) {
    ensureNoDuplicateIngredientIds(input.ingredients);
    await ensureIngredientsExist(input.ingredients);
  }

  const recipe = await updateRecipeInRepository(
    id,
    toRepositoryUpdateInput(input),
  );

  if (!recipe) {
    throw recipeNotFoundError();
  }

  return toRecipeDto(recipe);
};
