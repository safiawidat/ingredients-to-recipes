import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../lib/api';

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  apiRequest: apiRequestMock,
}));

import { getRecommendationHistory } from './recommendation-history-api';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('recommendation history API service', () => {
  it('gets recommendation history with the default GET behavior', async () => {
    const response = { data: { history: [] } };
    apiRequestMock.mockResolvedValue(response);

    await expect(getRecommendationHistory()).resolves.toBe(response);
    expect(apiRequestMock).toHaveBeenCalledWith('/recommendation-history');
  });

  it('propagates ApiError unchanged', async () => {
    const error = new ApiError(500, 'INTERNAL_SERVER_ERROR', 'safe message');
    apiRequestMock.mockRejectedValue(error);

    await expect(getRecommendationHistory()).rejects.toBe(error);
  });
});
