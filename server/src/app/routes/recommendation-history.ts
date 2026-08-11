import { Router } from 'express';

import { UserRole } from '../../generated/prisma/enums.js';
import { listRecommendationHistory } from '../controllers/recommendation-history-controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

export const recommendationHistoryRouter = Router();

recommendationHistoryRouter.use(
  authenticate,
  authorize(UserRole.USER, UserRole.ADMIN),
);

recommendationHistoryRouter.get('/', listRecommendationHistory);
