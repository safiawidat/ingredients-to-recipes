import { Router } from 'express';

import {
  getCurrentUser,
  login,
  logout,
  register,
} from '../controllers/auth-controller.js';
import { authenticate } from '../middleware/authenticate.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, getCurrentUser);
