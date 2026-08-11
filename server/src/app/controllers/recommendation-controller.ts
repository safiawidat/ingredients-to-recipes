import type { RequestHandler } from 'express';

import { ApplicationError } from '../errors/application-error.js';
import { recommendRecipes } from '../services/recommendation-service.js';
import { recommendationRequestSchema } from '../validation/recommendation-schemas.js';

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

export const createRecommendations: RequestHandler = async (
  request,
  response,
) => {
  const input = recommendationRequestSchema.parse(request.body);
  const result = await recommendRecipes(requireUserId(request.user?.id), input);

  response.status(200).json({ data: result });
};
