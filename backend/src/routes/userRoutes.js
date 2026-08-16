import express from 'express';
import * as userController from '../controllers/userController.js';
import { verifyAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/public-stats', userController.getPublicStats);
router.patch('/profile', verifyAuth, userController.updateProfile);
router.get('/providers', userController.getAllProviders);
router.get('/providers/:userId', userController.getUserById);
router.get('/providers-by-ward/:ward/:category_id', userController.getProvidersByWard);
router.get('/search', userController.searchUsers);

export default router;

