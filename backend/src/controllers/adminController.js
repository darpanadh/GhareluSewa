import { query } from '../config/database.js';

// Get platform statistics
export const getPlatformStats = async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'customer') as total_customers,
        (SELECT COUNT(*) FROM users WHERE role = 'provider') as total_providers,
        (SELECT COUNT(*) FROM users WHERE role = 'provider' AND is_verified = TRUE) as verified_providers,
        (SELECT COUNT(*) FROM users WHERE role = 'provider' AND is_verified = FALSE) as pending_providers,
        (SELECT COUNT(*) FROM bookings) as total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'completed') as completed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'in_progress') as active_bookings,
        (SELECT AVG(rating_avg) FROM provider_profiles) as avg_platform_rating,
        (SELECT COUNT(*) FROM service_categories) as total_categories,
        (SELECT COALESCE(SUM(commission), 0) FROM payments WHERE status = 'completed') as total_revenue
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

// Verify provider
export const verifyProvider = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      `UPDATE users SET is_verified = TRUE WHERE id = $1 AND role = 'provider' RETURNING id, name, email, is_verified`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const user = result.rows[0];

    // Notify provider
    await query(
      `INSERT INTO notifications (user_id, message, type)
       VALUES ($1, $2, $3)`,
      [userId, 'Your provider account has been verified!', 'verification_approved']
    );

    res.json({
      message: 'Provider verified',
      user,
    });
  } catch (error) {
    console.error('Verify provider error:', error);
    res.status(500).json({ error: 'Failed to verify provider' });
  }
};

// Reject provider
export const rejectProvider = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const result = await query(
      `UPDATE users SET is_active = FALSE WHERE id = $1 AND role = 'provider' RETURNING id, name, email`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const user = result.rows[0];

    // Notify provider
    await query(
      `INSERT INTO notifications (user_id, message, type)
       VALUES ($1, $2, $3)`,
      [userId, `Your provider account was rejected. Reason: ${reason || 'Not specified'}`, 'verification_rejected']
    );

    res.json({
      message: 'Provider rejected',
      user,
    });
  } catch (error) {
    console.error('Reject provider error:', error);
    res.status(500).json({ error: 'Failed to reject provider' });
  }
};

// Get pending providers
export const getPendingProviders = async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const result = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.ward, u.avatar_url, u.bio, u.created_at,
              pp.hourly_rate, pp.citizenship_no, sc.name as service_category
       FROM users u
       LEFT JOIN provider_profiles pp ON u.id = pp.user_id
       LEFT JOIN service_categories sc ON pp.category_id = sc.id
       WHERE u.role = 'provider' AND u.is_verified = FALSE AND u.is_active = TRUE
       ORDER BY u.created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get pending providers error:', error);
    res.status(500).json({ error: 'Failed to fetch pending providers' });
  }
};

// Get all bookings (admin view)
export const getAllBookings = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT b.id, b.customer_id, b.provider_id, b.status, b.booking_date, b.location,
             cu.name as customer_name, p.name as provider_name, sc.name as service_category,
             b.created_at, b.updated_at
      FROM bookings b
      JOIN users cu ON b.customer_id = cu.id
      JOIN users p ON b.provider_id = p.id
      JOIN service_categories sc ON b.category_id = sc.id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      sql += ` AND b.status = $${params.length + 1}`;
      params.push(status);
    }

    sql += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

// Get analytics dashboard data
export const getAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);

    const analytics = await query(`
      SELECT 
        DATE_TRUNC('day', b.created_at)::DATE as date,
        COUNT(*) as bookings_created,
        SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as bookings_completed,
        SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as bookings_cancelled,
        COALESCE(SUM(p.commission), 0) as daily_revenue
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id AND p.status = 'completed'
      WHERE b.created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
      GROUP BY DATE_TRUNC('day', b.created_at)
      ORDER BY date DESC
    `, [days]);

    const topProviders = await query(`
      SELECT u.id, u.name, u.avatar_url, pp.rating_avg, pp.total_reviews, COUNT(b.id) as booking_count
      FROM users u
      JOIN provider_profiles pp ON u.id = pp.user_id
      LEFT JOIN bookings b ON u.id = b.provider_id AND b.created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
      WHERE u.is_verified = TRUE
      GROUP BY u.id, pp.rating_avg, pp.total_reviews
      ORDER BY booking_count DESC, pp.rating_avg DESC
      LIMIT 10
    `, [days]);

    const categoryStats = await query(`
      SELECT sc.name, COUNT(b.id) as booking_count, AVG(r.rating) as avg_rating
      FROM service_categories sc
      LEFT JOIN bookings b ON sc.id = b.category_id AND b.created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
      LEFT JOIN reviews r ON b.id = r.booking_id
      GROUP BY sc.id, sc.name
      ORDER BY booking_count DESC
    `, [days]);

    res.json({
      date_range: { period: days + ' days' },
      bookings: analytics.rows,
      top_providers: topProviders.rows,
      category_stats: categoryStats.rows,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Deactivate user (admin)
export const deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const result = await query(
      `UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING id, name, email`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User deactivated',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
};

// Activate user (admin)
export const activateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      `UPDATE users SET is_active = TRUE WHERE id = $1 RETURNING id, name, email`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User activated',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ error: 'Failed to activate user' });
  }
};

// Get ALL users (admin)
export const getAllUsers = async (req, res) => {
  try {
    const { role, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT id, name, email, phone, role, ward, is_active, is_verified, created_at, avatar_url
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      sql += ` AND role = $${params.length + 1}`;
      params.push(role);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get ALL providers (admin) — includes verified + unverified
export const getAllProviders = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.ward, u.avatar_url, u.is_verified, u.is_active, u.created_at,
              pp.hourly_rate, pp.citizenship_no, pp.rating_avg, pp.total_reviews, sc.name as service_category
       FROM users u
       LEFT JOIN provider_profiles pp ON u.id = pp.user_id
       LEFT JOIN service_categories sc ON pp.category_id = sc.id
       WHERE u.role = 'provider'
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get all providers error:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
};

// Get all payout requests (admin)
export const getAllPayoutRequests = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM payout_requests ORDER BY requested_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get all payout requests error:', error);
    res.status(500).json({ error: 'Failed to fetch payout requests' });
  }
};

// Update payout request status (admin)
export const updatePayoutStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['completed', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await query(
      `UPDATE payout_requests
       SET status = $1, processed_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payout request not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update payout status error:', error);
    res.status(500).json({ error: 'Failed to update payout status' });
  }
};

