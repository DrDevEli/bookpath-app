///coming
import express from 'express';
import UserController from '../controllers/userController.js';
import { rateLimiterMiddleware } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', rateLimiterMiddleware, UserController.register);
router.post('/login', rateLimiterMiddleware, UserController.login);

// Protected routes (require authentication)
router.get('/profile', authenticate, UserController.getProfile);
router.put('/profile', authenticate, UserController.updateProfile);
router.post('/logout', authenticate, UserController.logout);

export default router;
