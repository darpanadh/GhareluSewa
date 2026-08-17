import express from 'express';
import * as authController from '../controllers/authController.js';
import { verifyAuth } from '../middleware/auth.js';
import { registerValidationRules, validate } from '../middleware/validators.js';

const router = express.Router();

// Routes with validation
router.post('/register', registerValidationRules, validate, authController.register);
router.post('/login', authController.login);
router.post('/reverify-kyc', authController.reverifyKYC);
router.get('/me', verifyAuth, authController.getCurrentUser);

export default router;