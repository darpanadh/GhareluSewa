import { query } from '../config/database.js';

// Create provider profile (after registration)
export const createProviderProfile = async (req, res) => {
  try {
    const { category_id, hourly_rate } = req.body;

    if (!category_id) {
      return res.status(400).json({ error: 'Category ID required' });
    }

    // Check if provider profile already exists
    const existing = await query(
      'SELECT id FROM provider_profiles WHERE user_id = $1',
      [req.userId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Provider profile already exists' });
    }

    const result = await query(
      `INSERT INTO provider_profiles (user_id, category_id, hourly_rate, availability)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, user_id, category_id, hourly_rate, availability, rating_avg`,
      [req.userId, category_id, hourly_rate || null]
    );

    // Update user role to provider if needed
    await query(
      `UPDATE users SET role = 'provider' WHERE id = $1 AND role = 'customer'`,
      [req.userId]
    );

    res.status(201).json({
      message: 'Provider profile created',
      profile: result.rows[0],
    });
  } catch (error) {
    console.error('Create provider profile error:', error);
    res.status(500).json({ error: 'Failed to create provider profile' });
  }
};

// Get provider profile
export const getProviderProfile = async (req, res) => {
  try {
    const { providerId } = req.params;

    const result = await query(
      `SELECT pp.id, pp.user_id, pp.category_id, pp.hourly_rate, pp.availability,
              pp.rating_avg, pp.total_reviews, sc.name as service_category
       FROM provider_profiles pp
       JOIN service_categories sc ON pp.category_id = sc.id
       WHERE pp.user_id = $1`,
      [providerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get provider profile error:', error);
    res.status(500).json({ error: 'Failed to fetch provider profile' });
  }
};

// Update provider profile
export const updateProviderProfile = async (req, res) => {
  try {
    const { category_id, hourly_rate, availability } = req.body;

    const result = await query(
      `UPDATE provider_profiles 
       SET category_id = COALESCE($1, category_id),
           hourly_rate = COALESCE($2, hourly_rate),
           availability = COALESCE($3, availability)
       WHERE user_id = $4
       RETURNING id, user_id, category_id, hourly_rate, availability, rating_avg, total_reviews`,
      [category_id, hourly_rate, availability, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider profile not found' });
    }

    res.json({
      message: 'Provider profile updated',
      profile: result.rows[0],
    });
  } catch (error) {
    console.error('Update provider profile error:', error);
    res.status(500).json({ error: 'Failed to update provider profile' });
  }
};

// Toggle provider availability
export const toggleAvailability = async (req, res) => {
  try {
    const { available } = req.body;

    const result = await query(
      `UPDATE provider_profiles 
       SET availability = $1
       WHERE user_id = $2
       RETURNING id, availability`,
      [available, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider profile not found' });
    }

    res.json({
      message: `Provider ${available ? 'online' : 'offline'}`,
      profile: result.rows[0],
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ error: 'Failed to toggle availability' });
  }
};

// Get provider earnings/stats
export const getProviderEarnings = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let sql = `
      SELECT 
        COUNT(*)::int as total_bookings,
        COALESCE(SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END), 0)::int as completed_bookings,
        COALESCE(SUM(CASE WHEN b.status = 'in_progress' THEN 1 ELSE 0 END), 0)::int as active_bookings,
        COALESCE(SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END), 0)::int as cancelled_bookings,
        COALESCE(SUM(CASE WHEN b.status = 'completed' THEN COALESCE(NULLIF(b.total_price, 0), NULLIF(pp.hourly_rate, 0), 650) ELSE 0 END), 0)::int as estimated_earnings
      FROM bookings b
      LEFT JOIN provider_profiles pp ON b.provider_id = pp.user_id
      WHERE b.provider_id = $1
    `;

    const params = [req.userId];

    if (start_date) {
      sql += ` AND b.created_at >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      sql += ` AND b.created_at <= $${params.length + 1}`;
      params.push(end_date);
    }

    const result = await query(sql, params);
    const row = result.rows[0] || {};

    res.json({
      total_bookings: Number(row.total_bookings || 0),
      completed_bookings: Number(row.completed_bookings || 0),
      active_bookings: Number(row.active_bookings || 0),
      cancelled_bookings: Number(row.cancelled_bookings || 0),
      estimated_earnings: Number(row.estimated_earnings || 0),
      total: Number(row.estimated_earnings || 0),
      jobs: Number(row.completed_bookings || 0),
      payments: []
    });
  } catch (error) {
    console.error('Get provider earnings error:', error);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
};

// Request withdrawal/payout
export const requestPayout = async (req, res) => {
  try {
    const { amount, method, account_details, provider_name, provider_email, category } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    const id = `PW-${Date.now().toString(36).toUpperCase()}`;

    const result = await query(
      `INSERT INTO payout_requests (id, provider_id, provider_name, provider_email, category, amount, method, account_details, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING *`,
      [id, req.userId, provider_name || 'Provider', provider_email || '', category || 'General', amount, method || 'eSewa', account_details || '']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Request payout error:', error);
    res.status(500).json({ error: 'Failed to submit payout request' });
  }
};

// Get provider payout requests
export const getMyPayouts = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM payout_requests WHERE provider_id = $1 ORDER BY requested_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get provider payouts error:', error);
    res.status(500).json({ error: 'Failed to fetch payout requests' });
  }
};

