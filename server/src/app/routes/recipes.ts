import { Router } from 'express';

import { getRecipe, listRecipes } from '../controllers/recipe-controller.js';
import { authenticate } from '../middleware/authenticate.js';

export const recipeRouter = Router();

recipeRouter.use(authenticate);

recipeRouter.get('/', listRecipes);
recipeRouter.get('/:id', getRecipe);
