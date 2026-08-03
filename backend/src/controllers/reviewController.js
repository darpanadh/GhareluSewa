import { query } from '../config/database.js';
import { sendNotification, notifyAllAdmins } from '../config/socketHelper.js';

// Create review (Customer only)
export const createReview = async (req, res) => {
  try {
    const { booking_id, rating, comment, photo_url, completion_status } = req.body;

    if (!booking_id || !rating) {
      return res.status(400).json({ error: 'Booking ID and rating required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Get booking details
    const bookingResult = await query(
      'SELECT customer_id, provider_id, status FROM bookings WHERE id = $1',
      [booking_id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'Can only review completed bookings' });
    }

    // Check if user is the customer
    if (req.userId !== booking.customer_id) {
      return res.status(403).json({ error: 'Only customer can review' });
    }

    // Check if review already exists
    const existingReview = await query(
      'SELECT id FROM reviews WHERE booking_id = $1',
      [booking_id]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({ error: 'Review already exists for this booking' });
    }

    // Detect repeated customer: has this customer booked this provider before (other than current booking)?
    const repeatCheck = await query(
      `SELECT COUNT(*) as cnt FROM bookings
       WHERE customer_id = $1 AND provider_id = $2 AND id != $3 AND status = 'completed'`,
      [booking.customer_id, booking.provider_id, booking_id]
    );
    const is_repeated_customer = parseInt(repeatCheck.rows[0]?.cnt || 0) > 0;

    // Create review with all proof fields
    const result = await query(
      `INSERT INTO reviews
         (booking_id, customer_id, provider_id, rating, comment, photo_url, completion_status, is_repeated_customer)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, booking_id, rating, comment, photo_url, completion_status, is_repeated_customer, created_at`,
      [
        booking_id, booking.customer_id, booking.provider_id,
        rating, comment || null,
        photo_url || null,
        completion_status || 'completed_on_time',
        is_repeated_customer
      ]
    );

    // Update provider's average rating
    const avgRating = await query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE provider_id = $1`,
      [booking.provider_id]
    );

    const ratingData = avgRating.rows[0];
    await query(
      `UPDATE provider_profiles SET rating_avg = $1, total_reviews = $2 WHERE user_id = $3`,
      [ratingData.avg_rating, ratingData.total_reviews, booking.provider_id]
    );

    // Get customer name for notification
    const customerResult = await query('SELECT name FROM users WHERE id = $1', [booking.customer_id]);
    const customerName = customerResult.rows[0]?.name || 'A customer';

    // Notify Provider
    await sendNotification(
      booking.provider_id, booking_id,
      `⭐ ${customerName} gave you a ${rating}-star review!${comment ? ` "${comment.substring(0, 60)}..."` : ''}`,
      'review'
    );

    // Notify All Admins
    await notifyAllAdmins(
      booking_id,
      `⭐ New review: ${customerName} rated booking #${booking_id} ${rating}/5 stars`,
      'admin_new_review'
    );

    res.status(201).json({
      message: 'Review created successfully',
      review: result.rows[0],
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
};

// Get reviews for provider
export const getProviderReviews = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const result = await query(
      `SELECT r.id, r.booking_id, r.rating, r.comment, r.photo_url,
              r.completion_status, r.is_repeated_customer, r.created_at,
              u.name as customer_name, u.avatar_url as customer_avatar
       FROM reviews r
       JOIN users u ON r.customer_id = u.id
       WHERE r.provider_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [providerId, limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// Get review for specific booking
export const getBookingReview = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const result = await query(
      `SELECT r.id, r.booking_id, r.rating, r.comment, r.created_at,
              u.name as customer_name, u.avatar_url as customer_avatar
       FROM reviews r
       JOIN users u ON r.customer_id = u.id
       WHERE r.booking_id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get booking review error:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
};

// Get provider stats
export const getProviderStats = async (req, res) => {
  try {
    const { providerId } = req.params;

    const stats = await query(
      `SELECT 
        pp.rating_avg,
        pp.total_reviews,
        COUNT(DISTINCT b.id) as total_bookings,
        SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN b.status = 'in_progress' THEN 1 ELSE 0 END) as active_bookings
       FROM provider_profiles pp
       LEFT JOIN bookings b ON pp.user_id = b.provider_id
       WHERE pp.user_id = $1
       GROUP BY pp.rating_avg, pp.total_reviews`,
      [providerId]
    );

    if (stats.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Get provider stats error:', error);
    res.status(500).json({ error: 'Failed to fetch provider stats' });
  }
};
