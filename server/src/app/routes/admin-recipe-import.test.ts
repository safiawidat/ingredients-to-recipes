import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationError } from '../errors/application-error.js';

const { importRecipesMock, verifyAccessTokenMock } = vi.hoisted(() => ({
  importRecipesMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('../services/recipe-import-service.js', () => ({
  importRecipes: importRecipesMock,
}));

vi.mock('../utils/token.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

import { app } from '../app.js';

const adminCookie = 'auth_token=admin-token';
const payload = { recipes: [{ controlled: 'payload' }] };

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/v1/admin/recipes/import', () => {
  it('rejects an unauthenticated request', async () => {
    const response = await request(app)
      .post('/api/v1/admin/recipes/import')
      .send(payload);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(importRecipesMock).not.toHaveBeenCalled();
  });

  it('rejects a non-admin user', async () => {
    verifyAccessTokenMock.mockReturnValue({ sub: 'user-1', role: 'USER' });

    const response = await request(app)
      .post('/api/v1/admin/recipes/import')
      .set('Cookie', adminCookie)
      .send(payload);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(importRecipesMock).not.toHaveBeenCalled();
  });

  it('returns the exact service summary to an admin', async () => {
    verifyAccessTokenMock.mockReturnValue({ sub: 'admin-1', role: 'ADMIN' });
    importRecipesMock.mockResolvedValue({
      received: 3,
      imported: 2,
      skippedDuplicates: 1,
      duplicates: [
        {
          recordIndex: 2,
          name: 'Tomato Basil Pasta',
          reason: 'EXISTING_RECIPE',
        },
      ],
    });

    const response = await request(app)
      .post('/api/v1/admin/recipes/import')
      .set('Cookie', adminCookie)
      .send(payload);

    expect(response.status).toBe(200);
    expect(importRecipesMock).toHaveBeenCalledWith(payload);
    expect(response.body).toEqual({
      data: {
        received: 3,
        imported: 2,
        skippedDuplicates: 1,
        duplicates: [
          {
            recordIndex: 2,
            name: 'Tomato Basil Pasta',
            reason: 'EXISTING_RECIPE',
          },
        ],
      },
    });
  });

  it.each([
    [400, 'VALIDATION_ERROR'],
    [422, 'UNKNOWN_INGREDIENTS'],
  ])('returns safe structured details for a %i service error', async (status, code) => {
    verifyAccessTokenMock.mockReturnValue({ sub: 'admin-1', role: 'ADMIN' });
    const details = {
      recordErrors: [
        {
          recordIndex: 0,
          recipeName: 'Example',
          path: 'ingredients[0].name',
          code: 'UNKNOWN_INGREDIENT',
          message: 'Safe validation detail',
        },
      ],
      totalErrors: 1,
      errorsTruncated: false,
    };
    importRecipesMock.mockRejectedValue(
      new ApplicationError(status, code, 'Safe import error', details),
    );

    const response = await request(app)
      .post('/api/v1/admin/recipes/import')
      .set('Cookie', adminCookie)
      .send(payload);

    expect(response.status).toBe(status);
    expect(response.body).toEqual({
      error: { code, message: 'Safe import error', details },
    });
  });

  it('does not expose unexpected server error details', async () => {
    verifyAccessTokenMock.mockReturnValue({ sub: 'admin-1', role: 'ADMIN' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    importRecipesMock.mockRejectedValue(new Error('private database details'));

    const response = await request(app)
      .post('/api/v1/admin/recipes/import')
      .set('Cookie', adminCookie)
      .send(payload);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('private database');
  });
});
