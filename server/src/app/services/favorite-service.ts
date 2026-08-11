import { ApplicationError } from '../errors/application-error.js';
import {
  deleteFavorite,
  findPublishedFavoriteRecipes,
  upsertFavorite,
} from '../repositories/favorite-repository.js';
import { findRecipeById } from '../repositories/recipe-repository.js';
import type { RecipeSummaryDto } from './recipe-service.js';

const recipeNotFoundError = (): ApplicationError =>
  new ApplicationError(
    404,
    'RECIPE_NOT_FOUND',
    'The specified recipe does not exist',
  );

export const listFavorites = async (
  userId: string,
): Promise<RecipeSummaryDto[]> => {
  const recipes = await findPublishedFavoriteRecipes(userId);

  return recipes.map((recipe) => ({
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
  }));
};

export const favoriteRecipe = async (
  userId: string,
  recipeId: string,
): Promise<void> => {
  const recipe = await findRecipeById(recipeId);

  if (!recipe?.isPublished) {
    throw recipeNotFoundError();
  }

  await upsertFavorite(userId, recipeId);
};

export const unfavoriteRecipe = (
  userId: string,
  recipeId: string,
): Promise<void> => deleteFavorite(userId, recipeId);
