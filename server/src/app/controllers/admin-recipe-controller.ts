import type { RequestHandler } from 'express';

import {
  createRecipe as createRecipeInService,
  updateRecipe as updateRecipeInService,
} from '../services/recipe-service.js';
import {
  createRecipeSchema,
  recipeIdParamSchema,
  updateRecipeSchema,
} from '../validation/recipe-schemas.js';

export const createRecipe: RequestHandler = async (request, response) => {
  const input = createRecipeSchema.parse(request.body);
  const recipe = await createRecipeInService(input);

  response.status(201).json({
    data: { recipe },
  });
};

export const updateRecipe: RequestHandler = async (request, response) => {
  const { id } = recipeIdParamSchema.parse(request.params);
  const input = updateRecipeSchema.parse(request.body);
  const recipe = await updateRecipeInService(id, input);

  response.status(200).json({
    data: { recipe },
  });
};
