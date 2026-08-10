import type { RequestHandler } from 'express';

import { listCanonicalIngredients } from '../services/ingredient-service.js';

export const listIngredients: RequestHandler = async (_request, response) => {
  const ingredients = await listCanonicalIngredients();

  response.status(200).json({
    data: { ingredients },
  });
};
