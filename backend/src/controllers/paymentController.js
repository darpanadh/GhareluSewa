import { query } from '../config/database.js';
import { sendNotification, notifyAllAdmins } from '../config/socketHelper.js';
import crypto from 'crypto';

const COMMISSION_RATE = 0.10; // 10% platform commission
const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST'; // configurable merchant code
const ESEWA_SUCCESS_URL = process.env.FRONTEND_URL
  ? `${process.env.FRONTEND_URL}/payment/success`
  : 'http://localhost:5173/payment/success';
const ESEWA_FAILURE_URL = process.env.FRONTEND_URL
  ? `${process.env.FRONTEND_URL}/payment/failed`
  : 'http://localhost:5173/payment/failed';

// Initiate payment — creates a pending payment record and returns eSewa form params
export const initiatePayment = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Get booking details
    const bookingResult = await query(
      `SELECT b.id, b.customer_id, b.provider_id, b.status, pp.hourly_rate
       FROM bookings b
       LEFT JOIN provider_profiles pp ON b.provider_id = pp.user_id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    // Only the customer can initiate payment
    if (booking.customer_id !== req.userId) {
      return res.status(403).json({ error: 'Only the customer can initiate payment' });
    }

    // Only allow payment on completed bookings
    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'Can only pay for completed bookings' });
    }

    // Check if already paid
    const existingPayment = await query(
      `SELECT id, status FROM payments WHERE booking_id = $1 AND status = 'completed'`,
      [bookingId]
    );
    if (existingPayment.rows.length > 0) {
      return res.status(409).json({ error: 'This booking has already been paid' });
    }

    // Calculate amounts (using hourly_rate as the service cost; default 800 if not set)
    const amount = parseFloat(booking.hourly_rate || 800);
    const commission = parseFloat((amount * COMMISSION_RATE).toFixed(2));
    const providerPayout = parseFloat((amount - commission).toFixed(2));

    // Generate unique order ID
    const oid = `GS-${bookingId}-${Date.now()}`;

    // Create/Update pending payment record
    await query(
      `INSERT INTO payments (booking_id, customer_id, provider_id, amount, commission, provider_payout, esewa_oid, status, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'esewa')
       ON CONFLICT (esewa_oid) DO NOTHING`,
      [bookingId, booking.customer_id, booking.provider_id, amount, commission, providerPayout, oid]
    );

    // Return eSewa form parameters
    res.json({
      amount,
      commission,
      providerPayout,
      esewa: {
        amount: amount.toString(),
        tax_amount: '0',
        total_amount: amount.toString(),
        transaction_uuid: oid,
        product_code: ESEWA_MERCHANT_CODE,
        product_service_charge: '0',
        product_delivery_charge: '0',
        success_url: ESEWA_SUCCESS_URL,
        failure_url: ESEWA_FAILURE_URL,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        // HMAC signature using eSewa secret key (sandbox)
        signature: generateEsewaSignature(amount, oid)
      }
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
};

// Verify eSewa payment after redirect back
export const verifyPayment = async (req, res) => {
  try {
    let { oid, amt, refId, data } = req.query;

    if (data) {
      // Decode eSewa v2 Base64 data response
      const decodedData = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
      oid = decodedData.transaction_uuid;
      amt = decodedData.total_amount.toString();
      refId = decodedData.transaction_code;

      // Verify HMAC-SHA256 signature sent by eSewa
      const secret = process.env.ESEWA_SECRET || '8gBm/:&EnhH.1/q';
      const message = `transaction_code=${decodedData.transaction_code},status=${decodedData.status},total_amount=${decodedData.total_amount},transaction_uuid=${decodedData.transaction_uuid},product_code=${decodedData.product_code},signed_field_names=${decodedData.signed_field_names}`;
      const generatedSignature = crypto.createHmac('sha256', secret).update(message).digest('base64');

      if (generatedSignature !== decodedData.signature) {
        return res.status(400).json({ error: 'Signature verification failed — payment rejected' });
      }

      if (decodedData.status !== 'COMPLETE') {
        return res.status(400).json({ error: `Payment status is ${decodedData.status} (expected COMPLETE)` });
      }
    }

    if (!oid || !amt || !refId) {
      return res.status(400).json({ error: 'Missing payment verification parameters' });
    }

    // Find the pending payment
    const paymentResult = await query(
      `SELECT * FROM payments WHERE esewa_oid = $1 AND status = 'pending'`,
      [oid]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found or already processed' });
    }

    const payment = paymentResult.rows[0];

    // Verify amount matches
    if (parseFloat(amt) !== parseFloat(payment.amount)) {
      await query(`UPDATE payments SET status = 'failed' WHERE esewa_oid = $1`, [oid]);
      return res.status(400).json({ error: 'Amount mismatch — payment rejected' });
    }

    // Mark payment as completed
    await query(
      `UPDATE payments SET status = 'completed', esewa_ref_id = $1, paid_at = CURRENT_TIMESTAMP WHERE esewa_oid = $2`,
      [refId, oid]
    );

    // Get names for notification messages
    const customerResult = await query('SELECT name FROM users WHERE id = $1', [payment.customer_id]);
    const providerResult = await query('SELECT name FROM users WHERE id = $1', [payment.provider_id]);
    const customerName = customerResult.rows[0]?.name || 'Customer';
    const providerName = providerResult.rows[0]?.name || 'Provider';

    // ── Notify Provider — payout pending escrow release ──
    await sendNotification(
      payment.provider_id, payment.booking_id,
      `💰 Customer paid Rs. ${payment.amount} to Gharelu Sewa for booking #${payment.booking_id}. Your payout of Rs. ${payment.provider_payout} will be released after admin verification.`,
      'payment_received'
    );

    // ── Notify Customer about confirmation ──
    await sendNotification(
      payment.customer_id, payment.booking_id,
      `✅ Payment of Rs. ${payment.amount} confirmed via eSewa (Ref: ${refId})`,
      'payment_confirmed'
    );

    // ── Notify All Admins about payment ──
    await notifyAllAdmins(
      payment.booking_id,
      `💰 Payment received: ${customerName} paid Rs. ${payment.amount} for booking #${payment.booking_id}. Commission: Rs. ${payment.commission}. Release Rs. ${payment.provider_payout} to ${providerName}.`,
      'admin_payment_received'
    );

    res.json({
      success: true,
      message: 'Payment verified and confirmed',
      payment: {
        id: payment.id,
        amount: payment.amount,
        commission: payment.commission,
        providerPayout: payment.provider_payout,
        refId,
        bookingId: payment.booking_id
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
};

// Get payment details for a booking
export const getPaymentByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const result = await query(
      `SELECT p.*, u.name as customer_name, u2.name as provider_name
       FROM payments p
       JOIN users u ON p.customer_id = u.id
       JOIN users u2 ON p.provider_id = u2.id
       WHERE p.booking_id = $1
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.json({ paid: false });
    }

    const payment = result.rows[0];
    const isPaid = payment.status === 'completed';
    const isPendingManual = payment.status === 'pending' && payment.payment_method !== 'esewa';

    res.json({
      paid: isPaid,
      pendingVerification: isPendingManual,
      payment,
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
};

// Get all payments (admin)
export const getAllPayments = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const result = await query(
      `SELECT p.*, u.name as customer_name, u2.name as provider_name, b.location
       FROM payments p
       JOIN users u ON p.customer_id = u.id
       JOIN users u2 ON p.provider_id = u2.id
       JOIN bookings b ON p.booking_id = b.id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

// ─── Submit manual payment (bank transfer / cash deposit) ────────────────────
export const submitManualPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { payment_method, manual_ref_id } = req.body;

    if (!['bank_transfer', 'cash_deposit'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }
    if (!manual_ref_id || !manual_ref_id.trim()) {
      return res.status(400).json({ error: 'Reference / slip number is required' });
    }

    // Validate booking belongs to this customer
    const bookingResult = await query(
      `SELECT b.id, b.customer_id, b.provider_id, b.status, pp.hourly_rate
       FROM bookings b
       LEFT JOIN provider_profiles pp ON b.provider_id = pp.user_id
       WHERE b.id = $1`,
      [bookingId]
    );
    if (bookingResult.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = bookingResult.rows[0];
    if (booking.customer_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    if (booking.status !== 'completed') return res.status(400).json({ error: 'Can only pay for completed bookings' });

    // Check not already paid
    const existing = await query(
      `SELECT id FROM payments WHERE booking_id = $1 AND status = 'completed'`,
      [bookingId]
    );
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Booking already paid' });

    const amount = parseFloat(booking.hourly_rate || 800);
    const commission = parseFloat((amount * COMMISSION_RATE).toFixed(2));
    const providerPayout = parseFloat((amount - commission).toFixed(2));
    const oid = `GS-MANUAL-${bookingId}-${Date.now()}`;

    const result = await query(
      `INSERT INTO payments
         (booking_id, customer_id, provider_id, amount, commission, provider_payout,
          esewa_oid, status, payment_method, manual_ref_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9)
       RETURNING *`,
      [bookingId, booking.customer_id, booking.provider_id, amount, commission, providerPayout,
       oid, payment_method, manual_ref_id.trim()]
    );

    const payment = result.rows[0];

    // Notify admins to verify payment
    await notifyAllAdmins(
      parseInt(bookingId),
      `📋 Manual payment submitted for Booking #${bookingId}. Method: ${payment_method}. Ref: ${manual_ref_id}. Amount: Rs. ${amount}. Please verify and release.`,
      'manual_payment_submitted'
    );

    res.status(201).json({
      success: true,
      message: 'Payment reference submitted. Admin will verify and release funds to provider.',
      payment: {
        id: payment.id,
        amount,
        commission,
        providerPayout,
        payment_method,
        manual_ref_id: payment.manual_ref_id,
        status: 'pending',
        bookingId: parseInt(bookingId),
      },
    });
  } catch (error) {
    console.error('Submit manual payment error:', error);
    res.status(500).json({ error: 'Failed to submit manual payment' });
  }
};

// ─── Admin: release escrow to provider ───────────────────────────────────────
export const releaseEscrow = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const paymentResult = await query(
      `SELECT * FROM payments WHERE id = $1`,
      [paymentId]
    );
    if (paymentResult.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    const payment = paymentResult.rows[0];

    if (payment.escrow_released) {
      return res.status(409).json({ error: 'Escrow already released for this payment' });
    }

    // Mark as completed + escrow released
    await query(
      `UPDATE payments
       SET status = 'completed', escrow_released = TRUE, escrow_released_at = CURRENT_TIMESTAMP,
           paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP)
       WHERE id = $1`,
      [paymentId]
    );

    // Notify provider
    await sendNotification(
      payment.provider_id, payment.booking_id,
      `💰 Gharelu Sewa has released your payout of Rs. ${payment.provider_payout} for booking #${payment.booking_id}. Funds will be transferred to your registered account.`,
      'escrow_released'
    );

    // Notify customer
    await sendNotification(
      payment.customer_id, payment.booking_id,
      `✅ Your payment of Rs. ${payment.amount} for booking #${payment.booking_id} has been confirmed and released to the provider.`,
      'payment_confirmed'
    );

    res.json({ success: true, message: 'Escrow released to provider successfully' });
  } catch (error) {
    console.error('Release escrow error:', error);
    res.status(500).json({ error: 'Failed to release escrow' });
  }
};

// HMAC-SHA256 signature for eSewa v2 API
function generateEsewaSignature(amount, transactionUuid) {
  const secret = process.env.ESEWA_SECRET || '8gBm/:&EnhH.1/q'; // eSewa sandbox secret
  const message = `total_amount=${amount},transaction_uuid=${transactionUuid},product_code=${ESEWA_MERCHANT_CODE}`;
  return crypto.createHmac('sha256', secret).update(message).digest('base64');
}
