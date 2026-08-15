import { afterEach, describe, expect, it, vi } from 'vitest';

import { AUTH_EXPIRED_EVENT, ApiError, apiRequest } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('sends JSON with credentials and parses successful responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiRequest('/test', {
        method: 'POST',
        body: { value: 1 },
      }),
    ).resolves.toEqual({ data: { ok: true } });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.credentials).toBe('include');
    expect(request.body).toBe(JSON.stringify({ value: 1 }));
    expect(new Headers(request.headers).get('Content-Type')).toBe(
      'application/json',
    );
  });

  it('supports a successful HTTP 204 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );

    await expect(apiRequest<void>('/auth/logout')).resolves.toBeUndefined();
  });

  it('maps backend errors to ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
            },
          }),
          { status: 401 },
        ),
      ),
    );

    await expect(
      apiRequest('/auth/login', { skipAuthExpiry: true }),
    ).rejects.toEqual(
      new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),
    );
  });

  it('broadcasts a protected-request 401 as an expired authentication state', async () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: 'INVALID_AUTH_TOKEN', message: 'Expired' },
          }),
          { status: 401 },
        ),
      ),
    );

    await expect(apiRequest('/recipes')).rejects.toBeInstanceOf(ApiError);

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
  });

  it.each([
    [403, false],
    [401, true],
  ])(
    'does not broadcast status %i when skipAuthExpiry is %s',
    async (status, skipAuthExpiry) => {
      const listener = vi.fn();
      window.addEventListener(AUTH_EXPIRED_EVENT, listener);
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              error: { code: 'REQUEST_FAILED', message: 'Request failed' },
            }),
            { status },
          ),
        ),
      );

      await expect(
        apiRequest('/test', { skipAuthExpiry }),
      ).rejects.toBeInstanceOf(ApiError);

      expect(listener).not.toHaveBeenCalled();
      window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
    },
  );

  it('preserves explicitly safe optional error details', async () => {
    const details = {
      recordErrors: [{ recordIndex: 0, message: 'Safe detail' }],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Recipe import validation failed',
              details,
            },
          }),
          { status: 400 },
        ),
      ),
    );

    await expect(apiRequest('/admin/recipes/import')).rejects.toEqual(
      new ApiError(
        400,
        'VALIDATION_ERROR',
        'Recipe import validation failed',
        details,
      ),
    );
  });
});
