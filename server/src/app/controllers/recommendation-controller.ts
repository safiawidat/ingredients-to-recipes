import type { RequestHandler } from 'express';

import { recommendRecipes } from '../services/recommendation-service.js';
import { recommendationRequestSchema } from '../validation/recommendation-schemas.js';

export const createRecommendations: RequestHandler = async (
  request,
  response,
) => {
  const input = recommendationRequestSchema.parse(request.body);
  const result = await recommendRecipes(input);

  response.status(200).json({ data: result });
};
