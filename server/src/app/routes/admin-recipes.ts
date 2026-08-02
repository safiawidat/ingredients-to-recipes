import { Router } from 'express';

import { UserRole } from '../../generated/prisma/enums.js';
import {
  createRecipe,
  updateRecipe,
} from '../controllers/admin-recipe-controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

export const adminRecipeRouter = Router();

adminRecipeRouter.use(authenticate, authorize(UserRole.ADMIN));

adminRecipeRouter.post('/', createRecipe);
adminRecipeRouter.patch('/:id', updateRecipe);
