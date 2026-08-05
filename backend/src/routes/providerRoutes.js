import express from 'express';
import * as providerController from '../controllers/providerController.js';
import { verifyAuth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Provider only
router.post('/profile', verifyAuth, authorize(['provider']), providerController.createProviderProfile);
router.get('/profile/:providerId', providerController.getProviderProfile);
router.patch('/profile', verifyAuth, authorize(['provider']), providerController.updateProviderProfile);
router.patch('/availability', verifyAuth, authorize(['provider']), providerController.toggleAvailability);
router.get('/earnings', verifyAuth, authorize(['provider']), providerController.getProviderEarnings);
router.post('/payouts', verifyAuth, authorize(['provider']), providerController.requestPayout);
router.get('/payouts', verifyAuth, authorize(['provider']), providerController.getMyPayouts);

export default router;
