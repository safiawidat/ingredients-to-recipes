import { Router } from 'express';

import { UserRole } from '../../generated/prisma/enums.js';
import {
  createAlias,
  deleteAlias,
  listAliases,
  updateAlias,
} from '../controllers/ingredient-alias-controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

export const ingredientAliasRouter = Router();

ingredientAliasRouter.use(authenticate, authorize(UserRole.ADMIN));

ingredientAliasRouter.get('/', listAliases);
ingredientAliasRouter.post('/', createAlias);
ingredientAliasRouter.patch('/:id', updateAlias);
ingredientAliasRouter.delete('/:id', deleteAlias);
