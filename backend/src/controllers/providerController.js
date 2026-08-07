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

    // Check if account is frozen due to overdue negative balance (>3 days)
    const profileCheck = await query(
      `SELECT is_frozen, negative_since FROM provider_profiles WHERE user_id = $1`,
      [req.userId]
    );

    const prof = profileCheck.rows[0];

    if (prof?.is_frozen) {
      return res.status(403).json({
        error: 'Your account is frozen due to overdue negative balance. Please contact Admin to clear your dues.'
      });
    }

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

// Get provider earnings/stats with dynamic chart data
export const getProviderEarnings = async (req, res) => {
  try {
    const { period = 'month', start_date, end_date } = req.query;

    let intervalClause = "INTERVAL '30 days'";
    if (period === 'week') intervalClause = "INTERVAL '7 days'";
    else if (period === 'year') intervalClause = "INTERVAL '365 days'";
    else if (period === 'all') intervalClause = "INTERVAL '50 years'";

    // Summary stats
    const statsResult = await query(
      `SELECT 
        COUNT(*)::int as total_bookings,
        COALESCE(SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END), 0)::int as completed_bookings,
        COALESCE(SUM(CASE WHEN b.status = 'in_progress' THEN 1 ELSE 0 END), 0)::int as active_bookings,
        COALESCE(SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END), 0)::int as cancelled_bookings,
        COALESCE(SUM(CASE WHEN b.status = 'completed' THEN COALESCE(NULLIF(b.total_price, 0), NULLIF(pp.hourly_rate, 0), 650) ELSE 0 END), 0)::int as estimated_earnings
       FROM bookings b
       LEFT JOIN provider_profiles pp ON b.provider_id = pp.user_id
       WHERE b.provider_id = $1 AND b.created_at >= CURRENT_DATE - ${intervalClause}`,
      [req.userId]
    );

    const row = statsResult.rows[0] || {};
    const totalEarnings = Number(row.estimated_earnings || 0);
    const completedJobs = Number(row.completed_bookings || 0);

    // Dynamic Chart Data Generation based on Period
    let chartData = [];
    if (period === 'week') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dailyResult = await query(
        `SELECT 
          TO_CHAR(b.booking_date, 'Dy') as day_label,
          EXTRACT(ISODOW FROM b.booking_date)::int as day_num,
          COALESCE(SUM(COALESCE(NULLIF(b.total_price, 0), 650)), 0)::int as total_amount,
          COUNT(*)::int as job_count
         FROM bookings b
         WHERE b.provider_id = $1 AND b.status = 'completed' AND b.booking_date >= CURRENT_DATE - INTERVAL '7 days'
         GROUP BY day_label, day_num
         ORDER BY day_num ASC`,
        [req.userId]
      );
      const dbMap = {};
      dailyResult.rows.forEach(r => {
        dbMap[r.day_label?.trim()] = { value: Number(r.total_amount), jobs: Number(r.job_count) };
      });
      chartData = days.map(d => ({
        day: d,
        label: d,
        value: dbMap[d]?.value || 0,
        jobs: dbMap[d]?.jobs || 0
      }));
    } else if (period === 'month') {
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const weeklyResult = await query(
        `SELECT 
          'Week ' || CEIL(EXTRACT(DAY FROM b.booking_date) / 7.0)::int as week_label,
          COALESCE(SUM(COALESCE(NULLIF(b.total_price, 0), 650)), 0)::int as total_amount,
          COUNT(*)::int as job_count
         FROM bookings b
         WHERE b.provider_id = $1 AND b.status = 'completed' AND b.booking_date >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY week_label
         ORDER BY week_label ASC`,
        [req.userId]
      );
      const dbMap = {};
      weeklyResult.rows.forEach(r => {
        dbMap[r.week_label] = { value: Number(r.total_amount), jobs: Number(r.job_count) };
      });
      chartData = weeks.map(w => ({
        day: w,
        label: w,
        value: dbMap[w]?.value || 0,
        jobs: dbMap[w]?.jobs || 0
      }));
    } else { // year or all
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyResult = await query(
        `SELECT 
          TO_CHAR(b.booking_date, 'Mon') as month_label,
          EXTRACT(MONTH FROM b.booking_date)::int as month_num,
          COALESCE(SUM(COALESCE(NULLIF(b.total_price, 0), 650)), 0)::int as total_amount,
          COUNT(*)::int as job_count
         FROM bookings b
         WHERE b.provider_id = $1 AND b.status = 'completed'
         GROUP BY month_label, month_num
         ORDER BY month_num ASC`,
        [req.userId]
      );
      const dbMap = {};
      monthlyResult.rows.forEach(r => {
        dbMap[r.month_label?.trim()] = { value: Number(r.total_amount), jobs: Number(r.job_count) };
      });
      chartData = months.map(m => ({
        day: m,
        label: m,
        value: dbMap[m]?.value || 0,
        jobs: dbMap[m]?.jobs || 0
      }));
    }

    // Fetch payout requests and provider profile flags (is_frozen, negative_since)
    const profileRes = await query(
      `SELECT is_frozen, negative_since FROM provider_profiles WHERE user_id = $1`,
      [req.userId]
    );
    const profData = profileRes.rows[0] || {};

    const payoutsRes = await query(
      `SELECT amount, status FROM payout_requests WHERE provider_id = $1`,
      [req.userId]
    );

    const pendingPayouts = payoutsRes.rows
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const completedPayouts = payoutsRes.rows
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const commissionFee = Math.round(totalEarnings * 0.10);
    const netEarnings = totalEarnings - commissionFee;

    // Available balance (can be negative if 10% commission on cash exceeds online earnings)
    const availableBalance = netEarnings - pendingPayouts - completedPayouts;

    let isFrozen = profData.is_frozen || false;
    let negativeSince = profData.negative_since || null;
    let daysRemaining = 3;

    // Evaluate negative balance & 3-day trial/freeze timer
    if (availableBalance < 0) {
      if (!negativeSince) {
        // Set negative_since timestamp to NOW
        negativeSince = new Date();
        await query(
          `UPDATE provider_profiles SET negative_since = CURRENT_TIMESTAMP WHERE user_id = $1`,
          [req.userId]
        );
      }

      const diffMs = new Date() - new Date(negativeSince);
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      daysRemaining = Math.max(0, Math.ceil(3 - diffDays));

      // If negative > 3 days, auto-freeze account & set availability offline
      if (diffDays >= 3 && !isFrozen) {
        isFrozen = true;
        await query(
          `UPDATE provider_profiles SET is_frozen = TRUE, availability = FALSE WHERE user_id = $1`,
          [req.userId]
        );
      }
    } else if (availableBalance >= 0 && (negativeSince || isFrozen)) {
      // Balance cleared! Reset negative_since & unfreeze
      isFrozen = false;
      negativeSince = null;
      await query(
        `UPDATE provider_profiles SET negative_since = NULL, is_frozen = FALSE WHERE user_id = $1`,
        [req.userId]
      );
    }

    res.json({
      total_bookings: Number(row.total_bookings || 0),
      completed_bookings: completedJobs,
      active_bookings: Number(row.active_bookings || 0),
      cancelled_bookings: Number(row.cancelled_bookings || 0),
      estimated_earnings: totalEarnings,
      total: totalEarnings,
      net_earnings: netEarnings,
      commission: commissionFee,
      available_balance: availableBalance,
      is_negative: availableBalance < 0,
      is_frozen: isFrozen,
      negative_since: negativeSince,
      days_remaining: daysRemaining,
      jobs: completedJobs,
      avg: completedJobs > 0 ? Math.round(totalEarnings / completedJobs) : 0,
      chartData,
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

