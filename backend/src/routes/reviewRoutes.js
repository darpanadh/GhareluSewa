import express from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { verifyAuth, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', verifyAuth, authorize(['customer']), reviewController.createReview);
router.get('/provider/:providerId', reviewController.getProviderReviews);
router.get('/booking/:bookingId', reviewController.getBookingReview);
router.get('/stats/:providerId', reviewController.getProviderStats);
router.delete('/:reviewId', verifyAuth, authorize(['admin']), reviewController.deleteReview);

export default router;
