import express from 'express';
import { verifyAuth, authorize } from '../middleware/auth.js';
import {
  initiatePayment,
  verifyPayment,
  getPaymentByBooking,
  getAllPayments,
  submitManualPayment,
  releaseEscrow,
} from '../controllers/paymentController.js';

const router = express.Router();

// Initiate eSewa payment for a completed booking
router.post('/initiate/:bookingId', verifyAuth, initiatePayment);

// Verify eSewa callback (called from frontend after eSewa redirects back)
router.get('/verify', verifyAuth, verifyPayment);

// Get payment status for a booking
router.get('/booking/:bookingId', verifyAuth, getPaymentByBooking);

// Submit a manual payment (bank transfer / cash deposit)
router.post('/manual/:bookingId', verifyAuth, submitManualPayment);

// Admin: release escrow (payout) to provider
router.post('/release/:paymentId', verifyAuth, authorize(['admin']), releaseEscrow);

// Admin: get all payments
router.get('/all', verifyAuth, authorize(['admin']), getAllPayments);

export default router;
