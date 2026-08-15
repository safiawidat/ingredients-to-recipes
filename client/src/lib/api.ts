import { env } from '../config/env';

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuthExpiry?: boolean;
}

export const AUTH_EXPIRED_EVENT = 'ingredients-to-recipes:auth-expired';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const apiRequest = async <T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> => {
  const {
    body,
    headers: optionHeaders,
    skipAuthExpiry = false,
    ...requestOptions
  } = options;
  const headers = new Headers(optionHeaders);

  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...requestOptions,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;

    if (response.status === 401 && !skipAuthExpiry) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }

    throw new ApiError(
      response.status,
      body.error?.code ?? 'REQUEST_FAILED',
      body.error?.message ?? 'The request could not be completed',
      body.error?.details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};
