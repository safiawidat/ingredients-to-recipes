import type { RequestHandler } from 'express';

import { importRecipes as importRecipesInService } from '../services/recipe-import-service.js';
import {
  createRecipe as createRecipeInService,
  listAllRecipes,
  updateRecipe as updateRecipeInService,
} from '../services/recipe-service.js';
import {
  createRecipeSchema,
  listRecipesQuerySchema,
  recipeIdParamSchema,
  updateRecipeSchema,
} from '../validation/recipe-schemas.js';

export const listRecipes: RequestHandler = async (request, response) => {
  const query = listRecipesQuerySchema.parse(request.query);
  const result = await listAllRecipes({
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

export const createRecipe: RequestHandler = async (request, response) => {
  const input = createRecipeSchema.parse(request.body);
  const recipe = await createRecipeInService(input);

  response.status(201).json({
    data: { recipe },
  });
};

export const importRecipes: RequestHandler = async (request, response) => {
  const summary = await importRecipesInService(request.body);

  response.status(200).json({ data: summary });
};

export const updateRecipe: RequestHandler = async (request, response) => {
  const { id } = recipeIdParamSchema.parse(request.params);
  const input = updateRecipeSchema.parse(request.body);
  const recipe = await updateRecipeInService(id, input);

  response.status(200).json({
    data: { recipe },
  });
};
