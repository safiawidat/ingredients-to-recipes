import type { RequestHandler } from 'express';

import { ApplicationError } from '../errors/application-error.js';
import { getRecommendationHistory } from '../services/recommendation-history-service.js';

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

export const listRecommendationHistory: RequestHandler = async (
  request,
  response,
) => {
  const history = await getRecommendationHistory(
    requireUserId(request.user?.id),
  );

  response.status(200).json({ data: { history } });
};
