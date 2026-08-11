import { apiRequest } from '../lib/api';
import type { RecommendationHistoryResponse } from '../types/recommendation-history';

export const getRecommendationHistory =
  (): Promise<RecommendationHistoryResponse> =>
    apiRequest<RecommendationHistoryResponse>('/recommendation-history');
