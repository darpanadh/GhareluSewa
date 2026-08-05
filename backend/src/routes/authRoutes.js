import express from 'express';
import * as authController from '../controllers/authController.js';
import { verifyAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/reverify-kyc', authController.reverifyKYC);
router.get('/me', verifyAuth, authController.getCurrentUser);

export default router;
