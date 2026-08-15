import { Router } from 'express';

import { UserRole } from '../../generated/prisma/enums.js';
import {
  favoriteRecipe,
  listFavorites,
  unfavoriteRecipe,
} from '../controllers/favorite-controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

export const favoriteRouter = Router();

favoriteRouter.use(
  authenticate,
  authorize(UserRole.USER, UserRole.ADMIN),
);

favoriteRouter.get('/', listFavorites);
favoriteRouter.put('/:recipeId', favoriteRecipe);
favoriteRouter.delete('/:recipeId', unfavoriteRecipe);
