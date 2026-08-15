import { Router } from 'express';

import { UserRole } from '../../generated/prisma/enums.js';
import {
  createRecipe,
  importRecipes,
  listRecipes,
  updateRecipe,
} from '../controllers/admin-recipe-controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

export const adminRecipeRouter = Router();

adminRecipeRouter.use(authenticate, authorize(UserRole.ADMIN));

adminRecipeRouter.get('/', listRecipes);
adminRecipeRouter.post('/import', importRecipes);
adminRecipeRouter.post('/', createRecipe);
adminRecipeRouter.patch('/:id', updateRecipe);
