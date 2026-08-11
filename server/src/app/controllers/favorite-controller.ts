import type { RequestHandler } from 'express';

import { ApplicationError } from '../errors/application-error.js';
import {
  favoriteRecipe as favoriteRecipeInService,
  listFavorites as listFavoritesInService,
  unfavoriteRecipe as unfavoriteRecipeInService,
} from '../services/favorite-service.js';
import { favoriteRecipeIdParamSchema } from '../validation/favorite-schemas.js';

const requireUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new ApplicationError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication required',
    );
  }

  return userId;
};

export const listFavorites: RequestHandler = async (request, response) => {
  const recipes = await listFavoritesInService(
    requireUserId(request.user?.id),
  );

  response.status(200).json({ data: { recipes } });
};

export const favoriteRecipe: RequestHandler = async (request, response) => {
  const { recipeId } = favoriteRecipeIdParamSchema.parse(request.params);

  await favoriteRecipeInService(
    requireUserId(request.user?.id),
    recipeId,
  );

  response.sendStatus(204);
};

export const unfavoriteRecipe: RequestHandler = async (request, response) => {
  const { recipeId } = favoriteRecipeIdParamSchema.parse(request.params);

  await unfavoriteRecipeInService(
    requireUserId(request.user?.id),
    recipeId,
  );

  response.sendStatus(204);
};
