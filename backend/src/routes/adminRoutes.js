import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { verifyAuth, authorize } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require admin role
router.use(verifyAuth, authorize(['admin']));

router.get('/stats', adminController.getPlatformStats);
router.get('/providers/pending', adminController.getPendingProviders);
router.get('/providers/all', adminController.getAllProviders);
router.patch('/providers/:userId/verify', adminController.verifyProvider);
router.patch('/providers/:userId/reject', adminController.rejectProvider);
router.patch('/providers/:userId/clear-dues', adminController.clearProviderDues);
router.get('/bookings', adminController.getAllBookings);
router.get('/bookings/export', adminController.getBookingsExport);
router.get('/analytics', adminController.getAdminAnalytics);
router.get('/users', adminController.getAllUsers);
router.patch('/users/:userId/deactivate', adminController.deactivateUser);
router.patch('/users/:userId/activate', adminController.activateUser);
router.get('/payouts', adminController.getAllPayoutRequests);
router.patch('/payouts/:id/status', adminController.updatePayoutStatus);

export default router;
