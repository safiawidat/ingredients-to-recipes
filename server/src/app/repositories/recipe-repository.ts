import type { IngredientCategory } from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../database/prisma.js';

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
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeIngredientDetail {
  id: string;
  quantity: Prisma.Decimal | null;
  unit: string | null;
  category: IngredientCategory;
  ingredient: {
    id: string;
    name: string;
  };
}

export interface RecipeDetail {
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
  ingredients: RecipeIngredientDetail[];
}

export interface RecipeDetailForUser extends RecipeDetail {
  favorites: { id: string }[];
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

export interface UpdateRecipeInput {
  name?: string;
  description?: string | null;
  instructions?: string;
  cuisine?: string | null;
  preparationTime?: number | null;
  servings?: number | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  dietTags?: string[];
  allergens?: string[];
  isPublished?: boolean;
  ingredients?: RecipeIngredientInput[];
}

export interface RecipeListParams {
  skip: number;
  take: number;
}

export interface RecipeListResult {
  recipes: RecipeSummary[];
  total: number;
}

export interface PublishedRecipeWithIngredients {
  id: string;
  name: string;
  description: string | null;
  cuisine: string | null;
  preparationTime: number | null;
  servings: number | null;
  imageUrl: string | null;
  dietTags: string[];
  allergens: string[];
  ingredients: {
    ingredient: {
      id: string;
      name: string;
    };
  }[];
}

const recipeSummarySelect = {
  id: true,
  name: true,
  description: true,
  cuisine: true,
  preparationTime: true,
  servings: true,
  imageUrl: true,
  dietTags: true,
  allergens: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
} as const;

const recipeDetailSelect = {
  id: true,
  name: true,
  description: true,
  instructions: true,
  cuisine: true,
  preparationTime: true,
  servings: true,
  imageUrl: true,
  sourceUrl: true,
  dietTags: true,
  allergens: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
  ingredients: {
    select: {
      id: true,
      quantity: true,
      unit: true,
      category: true,
      ingredient: {
        select: { id: true, name: true },
      },
    },
  },
} as const;

const publishedRecipeWithIngredientsSelect = {
  id: true,
  name: true,
  description: true,
  cuisine: true,
  preparationTime: true,
  servings: true,
  imageUrl: true,
  dietTags: true,
  allergens: true,
  ingredients: {
    select: {
      ingredient: {
        select: { id: true, name: true },
      },
    },
  },
} as const;

const toRecipeIngredientCreateInput = (ingredient: RecipeIngredientInput) => ({
  ingredientId: ingredient.ingredientId,
  ...(ingredient.quantity !== undefined
    ? { quantity: ingredient.quantity }
    : {}),
  ...(ingredient.unit !== undefined ? { unit: ingredient.unit } : {}),
  ...(ingredient.category !== undefined
    ? { category: ingredient.category }
    : {}),
});

const isRecordNotFoundError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2025';

const findRecipes = async (
  params: RecipeListParams,
  where: { isPublished?: boolean },
): Promise<RecipeListResult> => {
  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { name: 'asc' },
      select: recipeSummarySelect,
    }),
    prisma.recipe.count({ where }),
  ]);

  return { recipes, total };
};

export const findPublishedRecipes = (
  params: RecipeListParams,
): Promise<RecipeListResult> => findRecipes(params, { isPublished: true });

export const findAllRecipes = (
  params: RecipeListParams,
): Promise<RecipeListResult> => findRecipes(params, {});

export const findPublishedRecipesWithIngredients = (): Promise<
  PublishedRecipeWithIngredients[]
> =>
  prisma.recipe.findMany({
    where: { isPublished: true },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: publishedRecipeWithIngredientsSelect,
  });

export const findRecipeById = async (
  id: string,
): Promise<RecipeDetail | null> => {
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: recipeDetailSelect,
  });

  return recipe;
};

export const findRecipeByIdForUser = async (
  id: string,
  userId: string,
): Promise<RecipeDetailForUser | null> => {
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: {
      ...recipeDetailSelect,
      favorites: {
        where: { userId },
        select: { id: true },
      },
    },
  });

  return recipe;
};

export const createRecipe = async (
  input: CreateRecipeInput,
): Promise<RecipeDetail> => {
  const recipe = await prisma.recipe.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      instructions: input.instructions,
      cuisine: input.cuisine ?? null,
      preparationTime: input.preparationTime ?? null,
      servings: input.servings ?? null,
      imageUrl: input.imageUrl ?? null,
      sourceUrl: input.sourceUrl ?? null,
      dietTags: input.dietTags ?? [],
      allergens: input.allergens ?? [],
      isPublished: input.isPublished ?? true,
      ingredients: {
        create: input.ingredients.map(toRecipeIngredientCreateInput),
      },
    },
    select: recipeDetailSelect,
  });

  return recipe;
};

export const updateRecipe = async (
  id: string,
  input: UpdateRecipeInput,
): Promise<RecipeDetail | null> => {
  try {
    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
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
        ...(input.sourceUrl !== undefined
          ? { sourceUrl: input.sourceUrl }
          : {}),
        ...(input.dietTags !== undefined ? { dietTags: input.dietTags } : {}),
        ...(input.allergens !== undefined
          ? { allergens: input.allergens }
          : {}),
        ...(input.isPublished !== undefined
          ? { isPublished: input.isPublished }
          : {}),
        ...(input.ingredients !== undefined
          ? {
              ingredients: {
                deleteMany: {},
                create: input.ingredients.map(toRecipeIngredientCreateInput),
              },
            }
          : {}),
      },
      select: recipeDetailSelect,
    });

    return recipe;
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};
