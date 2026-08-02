import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';

import { env } from '../config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { requestLogger } from './middleware/request-logger.js';
import { adminRecipeRouter } from './routes/admin-recipes.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { ingredientAliasRouter } from './routes/ingredient-aliases.js';
import { recipeRouter } from './routes/recipes.js';

export const app = express();

app.use(requestLogger);
app.use(helmet());

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: '1mb',
  }),
);
app.use(cookieParser());

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/admin/ingredient-aliases', ingredientAliasRouter);
app.use('/api/v1/admin/recipes', adminRecipeRouter);
app.use('/api/v1/recipes', recipeRouter);

if (env.NODE_ENV === 'test') {
  app.get('/api/v1/test-error', () => {
    throw new Error('Test error');
  });
}

app.use(notFoundHandler);
app.use(errorHandler);
