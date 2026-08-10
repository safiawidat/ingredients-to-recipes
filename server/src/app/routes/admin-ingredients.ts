import { Router } from 'express';

import { UserRole } from '../../generated/prisma/enums.js';
import { listIngredients } from '../controllers/admin-ingredient-controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

export const adminIngredientRouter = Router();

adminIngredientRouter.use(authenticate, authorize(UserRole.ADMIN));

adminIngredientRouter.get('/', listIngredients);
