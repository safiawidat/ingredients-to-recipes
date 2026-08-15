import type { RequestHandler } from 'express';

import {
  createIngredientAlias,
  deleteIngredientAlias,
  listIngredientAliases,
  updateIngredientAlias,
} from '../services/ingredient-alias-service.js';
import {
  createIngredientAliasSchema,
  ingredientAliasIdParamSchema,
  updateIngredientAliasSchema,
} from '../validation/ingredient-alias-schemas.js';

export const listAliases: RequestHandler = async (_request, response) => {
  const aliases = await listIngredientAliases();

  response.status(200).json({
    data: { aliases },
  });
};

export const createAlias: RequestHandler = async (request, response) => {
  const input = createIngredientAliasSchema.parse(request.body);
  const alias = await createIngredientAlias(input);

  response.status(201).json({
    data: { alias },
  });
};

export const updateAlias: RequestHandler = async (request, response) => {
  const { id } = ingredientAliasIdParamSchema.parse(request.params);
  const input = updateIngredientAliasSchema.parse(request.body);
  const alias = await updateIngredientAlias(id, input);

  response.status(200).json({
    data: { alias },
  });
};

export const deleteAlias: RequestHandler = async (request, response) => {
  const { id } = ingredientAliasIdParamSchema.parse(request.params);

  await deleteIngredientAlias(id);

  response.status(204).send();
};
