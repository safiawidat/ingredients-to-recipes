import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getRecommendationHistoryMock, verifyAccessTokenMock } = vi.hoisted(
  () => ({
    getRecommendationHistoryMock: vi.fn(),
    verifyAccessTokenMock: vi.fn(),
  }),
);

vi.mock('../services/recommendation-history-service.js', () => ({
  getRecommendationHistory: getRecommendationHistoryMock,
}));

vi.mock('../utils/token.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

import { app } from '../app.js';

const history = [
  {
    id: 'history-2',
    ingredients: ['tomato'],
    recognizedIngredients: ['tomato'],
    unknownIngredients: [],
    resultCount: 2,
    limit: 5,
    createdAt: '2026-08-11T08:00:00.000Z',
  },
  {
    id: 'history-1',
    ingredients: ['onion'],
    recognizedIngredients: ['onion'],
    unknownIngredients: [],
    resultCount: 0,
    limit: 10,
    createdAt: '2026-08-10T08:00:00.000Z',
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  getRecommendationHistoryMock.mockResolvedValue(history);
});

describe('GET /api/v1/recommendation-history', () => {
  it('rejects unauthenticated requests without invoking the service', async () => {
    const response = await request(app).get(
      '/api/v1/recommendation-history',
    );

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      },
    });
    expect(getRecommendationHistoryMock).not.toHaveBeenCalled();
  });

  it.each([
    ['USER', 'user-1'],
    ['ADMIN', 'admin-1'],
  ])('allows an authenticated %s to read only their history', async (role, id) => {
    verifyAccessTokenMock.mockReturnValue({ sub: id, role });

    const response = await request(app)
      .get('/api/v1/recommendation-history')
      .set('Cookie', 'auth_token=valid-token');

    expect(response.status).toBe(200);
    expect(getRecommendationHistoryMock).toHaveBeenCalledWith(id);
    expect(response.body).toEqual({ data: { history } });
  });

  it('ignores client-supplied user IDs for ownership', async () => {
    verifyAccessTokenMock.mockReturnValue({ sub: 'user-1', role: 'USER' });

    await request(app)
      .get('/api/v1/recommendation-history?userId=other-user')
      .set('Cookie', 'auth_token=valid-token')
      .send({ userId: 'other-user' });

    expect(getRecommendationHistoryMock).toHaveBeenCalledWith('user-1');
    expect(getRecommendationHistoryMock).not.toHaveBeenCalledWith(
      'other-user',
    );
  });

  it('uses the safe standard 500 response for service failures', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    verifyAccessTokenMock.mockReturnValue({ sub: 'user-1', role: 'USER' });
    getRecommendationHistoryMock.mockRejectedValue(
      new Error('private database detail'),
    );

    const response = await request(app)
      .get('/api/v1/recommendation-history')
      .set('Cookie', 'auth_token=valid-token');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
    consoleError.mockRestore();
  });
});
