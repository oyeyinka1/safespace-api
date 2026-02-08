import express from 'express';
import { login, getProfile } from '../controllers/auth.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { authLimiter } from '../middleware/rateLimiter.middleware';
import { loginValidation } from '../utils/validators';

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/login', authLimiter, validate(loginValidation), login);

/**
 * @route   GET /api/auth/profile
 * @desc    Get admin profile
 * @access  Private (Admin)
 */
router.get('/profile', authenticateAdmin, getProfile);

export default router;