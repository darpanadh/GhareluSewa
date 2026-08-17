import { query } from '../config/database.js';
import { sendNotification, notifyAllAdmins } from '../config/socketHelper.js';

// Create booking (Customer)
export const createBooking = async (req, res) => {
  try {
    const { provider_id, category_id, booking_date, location, description, is_emergency } = req.body;

    if (!provider_id || !category_id || !booking_date || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get provider's hourly rate for total_price
    const providerPriceRes = await query('SELECT hourly_rate FROM provider_profiles WHERE user_id = $1', [provider_id]);
    const jobPrice = parseFloat(providerPriceRes.rows[0]?.hourly_rate || 650);

    const result = await query(
      `INSERT INTO bookings (customer_id, provider_id, category_id, booking_date, location, description, is_emergency, total_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, customer_id, provider_id, status, booking_date, location, is_emergency, total_price, created_at`,
      [req.userId, provider_id, category_id, booking_date, location, description || null, is_emergency || false, jobPrice]
    );

    const booking = result.rows[0];

    // Get customer name for notification message
    const customerResult = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    const customerName = customerResult.rows[0]?.name || 'A customer';

    // Get category name
    const catResult = await query('SELECT name FROM service_categories WHERE id = $1', [category_id]);
    const catName = catResult.rows[0]?.name || 'a service';

    // ── Notify Provider ──
    await sendNotification(
      provider_id, booking.id,
      `New ${catName} booking request from ${customerName}`,
      'booking_request'
    );

    // ── Notify All Admins ──
    await notifyAllAdmins(
      booking.id,
      `New booking #${booking.id}: ${customerName} booked ${catName}`,
      'admin_new_booking'
    );

    res.status(201).json({
      message: 'Booking created successfully',
      booking,
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
};

// Get all bookings for user
export const getUserBookings = async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT b.id, b.customer_id, b.provider_id, b.status, b.booking_date, b.location, b.is_emergency,
             cu.name as customer_name, cu.phone as customer_phone, cu.avatar_url as customer_avatar,
             p.name as provider_name, p.phone as provider_phone, p.avatar_url as provider_avatar,
             sc.name as service_category, b.created_at, b.updated_at,
             pay.status as payment_status, pay.payment_method as payment_method,
             CASE WHEN pay.status = 'completed' THEN TRUE ELSE FALSE END as is_paid
      FROM bookings b
      JOIN users cu ON b.customer_id = cu.id
      JOIN users p ON b.provider_id = p.id
      JOIN service_categories sc ON b.category_id = sc.id
      LEFT JOIN LATERAL (
        SELECT status, payment_method FROM payments WHERE booking_id = b.id ORDER BY created_at DESC LIMIT 1
      ) pay ON true
      WHERE (b.customer_id = $1 OR b.provider_id = $1)
    `;

    const params = [req.userId];

    if (status) {
      sql += ` AND b.status = $${params.length + 1}`;
      params.push(status);
    }

    sql += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

// Get booking by ID
export const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const result = await query(
      `SELECT b.id, b.customer_id, b.provider_id, b.status, b.booking_date, b.location, b.description, b.is_emergency,
              cu.name as customer_name, cu.phone as customer_phone, cu.avatar_url as customer_avatar, cu.ward as customer_ward,
              p.name as provider_name, p.phone as provider_phone, p.avatar_url as provider_avatar, p.ward as provider_ward,
              sc.name as service_category, pp.hourly_rate, b.created_at, b.updated_at
       FROM bookings b
       JOIN users cu ON b.customer_id = cu.id
       JOIN users p ON b.provider_id = p.id
       JOIN service_categories sc ON b.category_id = sc.id
       LEFT JOIN provider_profiles pp ON p.id = pp.user_id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if user is part of this booking
    const booking = result.rows[0];
    if (booking.customer_id !== req.userId && booking.provider_id !== req.userId && req.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
};

// Update booking status (Provider or Admin)
export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, message } = req.body;

    const validStatuses = ['pending', 'accepted', 'in_progress', 'awaiting_payment', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get booking first
    const bookingResult = await query(
      `SELECT b.customer_id, b.provider_id, b.status,
              cu.name as customer_name, p.name as provider_name,
              sc.name as service_category
       FROM bookings b
       JOIN users cu ON b.customer_id = cu.id
       JOIN users p ON b.provider_id = p.id
       JOIN service_categories sc ON b.category_id = sc.id
       WHERE b.id = $1`,
      [bookingId]
    );
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    // Check authorization - only provider or admin can update
    if (req.role !== 'admin' && req.userId !== booking.provider_id) {
      return res.status(403).json({ error: 'Only provider or admin can update booking' });
    }

    // Negative Balance Restriction: Prevent providers with negative balance from accepting customer jobs
    if ((status === 'accepted' || status === 'in_progress') && req.role !== 'admin') {
      const balRes = await query(
        `SELECT COALESCE(SUM(provider_payout), 0)::numeric as total_payout FROM payments WHERE provider_id = $1 AND status = 'completed' AND escrow_released = TRUE`,
        [req.userId]
      );
      const payoutReqsRes = await query(
        `SELECT COALESCE(SUM(amount), 0)::numeric as total_requested FROM payout_requests WHERE provider_id = $1`,
        [req.userId]
      );
      const currentBalance = Number(balRes.rows[0]?.total_payout || 0) - Number(payoutReqsRes.rows[0]?.total_requested || 0);

      if (currentBalance < 0) {
        await query(
          `UPDATE provider_profiles SET is_frozen = TRUE, availability = FALSE WHERE user_id = $1`,
          [req.userId]
        );
        return res.status(403).json({
          error: `Account Restricted: Your account balance is negative (Rs. ${currentBalance.toFixed(2)}). You cannot accept or start new bookings until your platform commission balance is cleared.`
        });
      }
    }

    // Update booking
    const result = await query(
      `UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, bookingId]
    );

    // ── Build meaningful notification messages ──
    const statusMessages = {
      accepted: {
        customer: `Great news! ${booking.provider_name} accepted your ${booking.service_category} booking #${bookingId}`,
        admin: `Booking #${bookingId}: ${booking.provider_name} accepted ${booking.customer_name}'s ${booking.service_category} request`,
        provider: null,
      },
      in_progress: {
        customer: `${booking.provider_name} has started working on your ${booking.service_category} job #${bookingId}`,
        admin: `Booking #${bookingId}: ${booking.provider_name} started work for ${booking.customer_name}`,
        provider: null,
      },
      awaiting_payment: {
        customer: `Work completed by ${booking.provider_name}! Please proceed to pay online for booking #${bookingId}.`,
        admin: `Booking #${bookingId}: Work completed by ${booking.provider_name}. Awaiting customer payment.`,
        provider: null,
      },
      completed: {
        customer: `Your ${booking.service_category} job #${bookingId} is now complete! Thank you for using Gharelu Sewa.`,
        admin: `Booking #${bookingId} completed: ${booking.provider_name} finished ${booking.service_category} for ${booking.customer_name}`,
        provider: null,
      },
      cancelled: {
        customer: `Booking #${bookingId} for ${booking.service_category} has been cancelled by the provider.`,
        admin: `Booking #${bookingId} cancelled: ${booking.provider_name} declined ${booking.customer_name}'s ${booking.service_category} request`,
        provider: null,
      },
    };

    const msgs = statusMessages[status] || {
      customer: `Booking #${bookingId} status changed to ${status}`,
      admin: `Booking #${bookingId} status: ${status}`,
    };

    // ── Notify Customer ──
    if (msgs.customer) {
      await sendNotification(booking.customer_id, parseInt(bookingId), msgs.customer, `booking_${status}`);
    }

    // ── Notify All Admins ──
    if (msgs.admin) {
      await notifyAllAdmins(parseInt(bookingId), msgs.admin, `admin_booking_${status}`);
    }

    res.json({
      message: 'Booking status updated',
      booking: result.rows[0],
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
};

// Cancel booking
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const bookingResult = await query(
      `SELECT b.customer_id, b.provider_id, cu.name as customer_name, p.name as provider_name, sc.name as service_category
       FROM bookings b
       JOIN users cu ON b.customer_id = cu.id
       JOIN users p ON b.provider_id = p.id
       JOIN service_categories sc ON b.category_id = sc.id
       WHERE b.id = $1`,
      [bookingId]
    );
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    // Check if user is part of booking
    if (req.userId !== booking.customer_id && req.userId !== booking.provider_id && req.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `UPDATE bookings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [bookingId]
    );

    const cancelledBy = req.userId === booking.customer_id ? booking.customer_name : booking.provider_name;

    // ── Notify the other party ──
    const otherUserId = req.userId === booking.customer_id ? booking.provider_id : booking.customer_id;
    await sendNotification(
      otherUserId, parseInt(bookingId),
      `Booking #${bookingId} for ${booking.service_category} has been cancelled by ${cancelledBy}`,
      'booking_cancelled'
    );

    // ── Notify All Admins ──
    await notifyAllAdmins(
      parseInt(bookingId),
      `Booking #${bookingId} cancelled by ${cancelledBy} (${booking.service_category})`,
      'admin_booking_cancelled'
    );

    res.json({
      message: 'Booking cancelled',
      booking: result.rows[0],
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
};

// Create emergency booking (broadcasts to all available providers in ward)
export const createEmergencyBooking = async (req, res) => {
  try {
    const { category_id, location, description, ward } = req.body;

    if (!category_id || !location || !ward) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get all available providers in the ward or covering whole city
    const cityMatch = ward.match(/^(Kathmandu|Pokhara|Bharatpur)/i);
    const cityName = cityMatch ? cityMatch[1] : ward.split(' ')[0];

    const providersResult = await query(
      `SELECT u.id FROM users u
       JOIN provider_profiles pp ON u.id = pp.user_id
       WHERE (u.ward = $1 OR u.ward ILIKE $2 OR pp.service_wards ILIKE $3 OR pp.service_wards ILIKE $4) AND pp.category_id = $5 AND u.is_verified = TRUE AND pp.availability = TRUE`,
      [ward, `${cityName}%Whole City%`, `%${ward}%`, `%Whole City%`, category_id]
    );

    if (providersResult.rows.length === 0) {
      return res.status(404).json({ error: 'No available providers in this ward' });
    }

    // Get the first available provider (for simplicity in MVP)
    const providerId = providersResult.rows[0].id;

    const result = await query(
      `INSERT INTO bookings (customer_id, provider_id, category_id, booking_date, location, description, is_emergency)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, true)
       RETURNING id, customer_id, provider_id, status, created_at`,
      [req.userId, providerId, category_id, location, description || null]
    );

    const booking = result.rows[0];

    // Get customer name
    const customerResult = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    const customerName = customerResult.rows[0]?.name || 'A customer';

    // Notify all available providers
    for (const provider of providersResult.rows) {
      await sendNotification(
        provider.id, booking.id,
        `🚨 URGENT: Emergency service request from ${customerName} in ${ward}`,
        'emergency_request'
      );
    }

    // ── Notify All Admins ──
    await notifyAllAdmins(
      booking.id,
      `🚨 Emergency booking #${booking.id} from ${customerName} in ${ward}`,
      'admin_emergency_booking'
    );

    res.status(201).json({
      message: 'Emergency booking created and providers notified',
      booking,
      notified_providers: providersResult.rows.length,
    });
  } catch (error) {
    console.error('Create emergency booking error:', error);
    res.status(500).json({ error: 'Failed to create emergency booking' });
  }
};
