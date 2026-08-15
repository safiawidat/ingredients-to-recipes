import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { ApplicationError } from '../errors/application-error.js';

const hasErrorType = (error: unknown, type: string): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'type' in error &&
  error.type === type;

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  next,
) => {
  void next;

  if (error instanceof ApplicationError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    });
    return;
  }

  if (hasErrorType(error, 'entity.parse.failed')) {
    response.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must contain valid JSON',
      },
    });
    return;
  }

  if (hasErrorType(error, 'entity.too.large')) {
    response.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body exceeds the 1 MiB limit',
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    return;
  }

  console.error(error);

  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};
