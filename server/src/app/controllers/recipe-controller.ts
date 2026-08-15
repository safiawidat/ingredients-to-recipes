import type { RequestHandler } from 'express';

import { ApplicationError } from '../errors/application-error.js';
import {
  getRecipeByIdForUser,
  listPublishedRecipes,
} from '../services/recipe-service.js';
import {
  listRecipesQuerySchema,
  recipeIdParamSchema,
} from '../validation/recipe-schemas.js';

export const listRecipes: RequestHandler = async (request, response) => {
  const query = listRecipesQuerySchema.parse(request.query);

  if (query.cuisine !== undefined || query.maxPreparationTime !== undefined) {
    throw new ApplicationError(
      400,
      'UNSUPPORTED_RECIPE_FILTER',
      'Cuisine and maximum preparation time filters are not supported yet',
    );
  }

  const result = await listPublishedRecipes({
    page: query.page,
    pageSize: query.pageSize,
  });

  response.status(200).json({
    data: {
      recipes: result.recipes,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    },
  });
};

export const getRecipe: RequestHandler = async (request, response) => {
  const { id } = recipeIdParamSchema.parse(request.params);

  if (!request.user) {
    throw new ApplicationError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication required',
    );
  }

  const recipe = await getRecipeByIdForUser(
    id,
    request.user.id,
    request.user.role,
  );

  response.status(200).json({
    data: { recipe },
  });
};
