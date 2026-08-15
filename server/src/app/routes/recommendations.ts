import { Router } from 'express';

import { createRecommendations } from '../controllers/recommendation-controller.js';
import { authenticate } from '../middleware/authenticate.js';

export const recommendationRouter = Router();

recommendationRouter.use(authenticate);

recommendationRouter.post('/', createRecommendations);
