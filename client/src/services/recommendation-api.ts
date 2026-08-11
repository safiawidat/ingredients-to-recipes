import { apiRequest } from '../lib/api';
import type {
  RecommendationRequest,
  RecommendationResponse,
} from '../types/recommendation';

export const recommendRecipes = (
  input: RecommendationRequest,
): Promise<RecommendationResponse> =>
  apiRequest<RecommendationResponse>('/recommendations', {
    method: 'POST',
    body: input,
  });
