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
        (SELECT COALESCE(AVG(rating_avg), 5.0) FROM provider_profiles) as avg_platform_rating,
        (SELECT COUNT(*) FROM service_categories) as total_categories,
        (
          SELECT COALESCE(SUM(
            CASE 
              WHEN p.commission IS NOT NULL AND p.commission > 0 THEN p.commission
              ELSE COALESCE(NULLIF(b.total_price, 0), 650) * 0.10
            END
          ), 0)::numeric
          FROM bookings b
          LEFT JOIN payments p ON b.id = p.booking_id
          WHERE b.status = 'completed' OR p.status = 'completed' OR p.escrow_released = TRUE
        ) as total_revenue,
        (
          SELECT COALESCE(SUM(
            CASE 
              WHEN p.commission IS NOT NULL AND p.commission > 0 THEN p.commission
              ELSE COALESCE(NULLIF(b.total_price, 0), 650) * 0.10
            END
          ), 0)::numeric
          FROM bookings b
          LEFT JOIN payments p ON b.id = p.booking_id
          WHERE b.status = 'completed' OR p.status = 'completed' OR p.escrow_released = TRUE
        ) as platform_revenue,
        (
          SELECT COALESCE(SUM(
            CASE 
              WHEN p.amount IS NOT NULL AND p.amount > 0 THEN p.amount
              ELSE COALESCE(NULLIF(b.total_price, 0), 650)
            END
          ), 0)::numeric
          FROM bookings b
          LEFT JOIN payments p ON b.id = p.booking_id
          WHERE b.status = 'completed' OR p.status = 'completed' OR p.escrow_released = TRUE
        ) as total_transactions
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

// Get admin analytics & dynamic chart data
export const getAdminAnalytics = async (req, res) => {
  try {
    const { period = '7days', categoryId } = req.query;

    let intervalClause = "INTERVAL '7 days'";
    if (period === '30days') intervalClause = "INTERVAL '30 days'";
    else if (period === '6months') intervalClause = "INTERVAL '180 days'";
    else if (period === '1year') intervalClause = "INTERVAL '365 days'";

    let categoryFilter = '';
    const params = [];
    if (categoryId) {
      params.push(categoryId);
      categoryFilter = ` AND b.category_id = $${params.length}`;
    }

    // Chart Data Generation based on Period
    let chartData = [];
    if (period === '7days') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dailyResult = await query(
        `SELECT 
          TO_CHAR(b.booking_date, 'Dy') as day_label,
          EXTRACT(ISODOW FROM b.booking_date)::int as day_num,
          COALESCE(SUM(COALESCE(NULLIF(b.total_price, 0), 650)), 0)::int as total_revenue,
          COUNT(*)::int as booking_count
         FROM bookings b
         WHERE b.booking_date >= CURRENT_DATE - ${intervalClause}${categoryFilter}
         GROUP BY day_label, day_num
         ORDER BY day_num ASC`,
        params
      );
      const dbMap = {};
      dailyResult.rows.forEach(r => {
        dbMap[r.day_label?.trim()] = {
          value: Number(r.total_revenue),
          bookings: Number(r.booking_count),
          commission: Math.round(Number(r.total_revenue) * 0.10)
        };
      });
      chartData = days.map(d => ({
        day: d,
        label: d,
        value: dbMap[d]?.value || 0,
        bookings: dbMap[d]?.bookings || 0,
        commission: dbMap[d]?.commission || 0
      }));
    } else if (period === '30days') {
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const weeklyResult = await query(
        `SELECT 
          'Week ' || CEIL(EXTRACT(DAY FROM b.booking_date) / 7.0)::int as week_label,
          COALESCE(SUM(COALESCE(NULLIF(b.total_price, 0), 650)), 0)::int as total_revenue,
          COUNT(*)::int as booking_count
         FROM bookings b
         WHERE b.booking_date >= CURRENT_DATE - ${intervalClause}${categoryFilter}
         GROUP BY week_label
         ORDER BY week_label ASC`,
        params
      );
      const dbMap = {};
      weeklyResult.rows.forEach(r => {
        dbMap[r.week_label] = {
          value: Number(r.total_revenue),
          bookings: Number(r.booking_count),
          commission: Math.round(Number(r.total_revenue) * 0.10)
        };
      });
      chartData = weeks.map(w => ({
        day: w,
        label: w,
        value: dbMap[w]?.value || 0,
        bookings: dbMap[w]?.bookings || 0,
        commission: dbMap[w]?.commission || 0
      }));
    } else { // 6months or 1year
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyResult = await query(
        `SELECT 
          TO_CHAR(b.booking_date, 'Mon') as month_label,
          EXTRACT(MONTH FROM b.booking_date)::int as month_num,
          COALESCE(SUM(COALESCE(NULLIF(b.total_price, 0), 650)), 0)::int as total_revenue,
          COUNT(*)::int as booking_count
         FROM bookings b
         WHERE b.booking_date >= CURRENT_DATE - ${intervalClause}${categoryFilter}
         GROUP BY month_label, month_num
         ORDER BY month_num ASC`,
        params
      );
      const dbMap = {};
      monthlyResult.rows.forEach(r => {
        dbMap[r.month_label?.trim()] = {
          value: Number(r.total_revenue),
          bookings: Number(r.booking_count),
          commission: Math.round(Number(r.total_revenue) * 0.10)
        };
      });
      chartData = months.map(m => ({
        day: m,
        label: m,
        value: dbMap[m]?.value || 0,
        bookings: dbMap[m]?.bookings || 0,
        commission: dbMap[m]?.commission || 0
      }));
    }

    // Dynamic Category Distribution
    const categoryColors = {
      'Plumbing': '#f59e0b',
      'Electrical': '#10b981',
      'Cleaning': '#07535f',
      'AC Service': '#6366f1',
      'Carpentry': '#ef4444',
      'Painting': '#ec4899',
    };

    const catResult = await query(`
      SELECT 
        sc.name as category_name,
        COUNT(b.id)::int as booking_count
      FROM service_categories sc
      LEFT JOIN bookings b ON sc.id = b.category_id
      GROUP BY sc.id, sc.name
      ORDER BY booking_count DESC
    `);

    const totalCategoryBookings = catResult.rows.reduce((sum, r) => sum + Number(r.booking_count), 0);
    const serviceData = catResult.rows.map(r => {
      const pct = totalCategoryBookings > 0 ? Math.round((Number(r.booking_count) / totalCategoryBookings) * 100) : 0;
      return {
        name: r.category_name,
        value: pct,
        color: categoryColors[r.category_name] || '#07535f'
      };
    });

    res.json({
      chartData,
      serviceData: serviceData.length > 0 ? serviceData : [
        { name: 'Cleaning', value: 35, color: '#07535f' },
        { name: 'Plumbing', value: 25, color: '#f59e0b' },
        { name: 'Electrical', value: 22, color: '#10b981' },
        { name: 'AC Service', value: 18, color: '#6366f1' },
      ]
    });
  } catch (error) {
    console.error('Get admin analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Verify provider
export const verifyProvider = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      `UPDATE users SET is_verified = TRUE, is_active = TRUE WHERE id = $1 AND role = 'provider' RETURNING id, name, email, is_verified`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    await query(
      `UPDATE provider_profiles SET background_check_status = 'verified' WHERE user_id = $1`,
      [userId]
    );

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
      `UPDATE users SET is_active = FALSE, is_verified = FALSE WHERE id = $1 AND role = 'provider' RETURNING id, name, email`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    await query(
      `UPDATE provider_profiles SET background_check_status = 'rejected' WHERE user_id = $1`,
      [userId]
    );

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
              pp.hourly_rate, pp.citizenship_no, pp.citizenship_image_url, sc.name as service_category
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
      `SELECT u.id, u.name, u.email, u.phone, u.ward, u.avatar_url, u.bio, u.is_verified, u.is_active, u.created_at,
              pp.hourly_rate, pp.citizenship_no, pp.citizenship_image_url, pp.rating_avg, pp.total_reviews, pp.is_frozen, pp.negative_since, sc.name as service_category
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

// Clear provider dues & unfreeze account (Admin action)
export const clearProviderDues = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      `UPDATE provider_profiles
       SET is_frozen = FALSE, negative_since = NULL, availability = TRUE
       WHERE user_id = $1
       RETURNING id, user_id, is_frozen, negative_since, availability`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider profile not found' });
    }

    // Notify provider
    await query(
      `INSERT INTO notifications (user_id, message, type)
       VALUES ($1, $2, $3)`,
      [userId, '✅ Your negative balance dues have been cleared by Admin! Account unfrozen.', 'dues_cleared']
    );

    res.json({
      message: 'Provider dues cleared and account unfrozen successfully',
      profile: result.rows[0],
    });
  } catch (error) {
    console.error('Clear provider dues error:', error);
    res.status(500).json({ error: 'Failed to clear provider dues' });
  }
};
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

// Get ALL bookings with full details for export/reports
export const getBookingsExport = async (req, res) => {
  try {
    const { status, from, to, search } = req.query;

    let sql = `
      SELECT 
        b.id as booking_id,
        b.status,
        b.booking_date,
        b.created_at as booked_at,
        b.updated_at as last_updated,
        b.location,
        b.description,
        b.is_emergency,
        b.total_price,
        sc.name as service_category,
        cu.name as customer_name,
        cu.phone as customer_phone,
        cu.email as customer_email,
        cu.ward as customer_ward,
        pu.name as provider_name,
        pu.phone as provider_phone,
        pu.email as provider_email,
        pu.ward as provider_ward,
        pay.status as payment_status,
        pay.amount as amount_paid,
        pay.commission as platform_commission,
        pay.payment_method,
        pay.transaction_id,
        pay.paid_at,
        r.rating as review_rating,
        r.comment as review_comment
      FROM bookings b
      JOIN users cu ON b.customer_id = cu.id
      JOIN users pu ON b.provider_id = pu.id
      JOIN service_categories sc ON b.category_id = sc.id
      LEFT JOIN payments pay ON b.id = pay.booking_id
      LEFT JOIN reviews r ON b.id = r.booking_id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND b.status = $${params.length}`;
    }

    if (from) {
      params.push(from);
      sql += ` AND b.booking_date >= $${params.length}::date`;
    }

    if (to) {
      params.push(to);
      sql += ` AND b.booking_date <= ($${params.length}::date + INTERVAL '1 day')`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (cu.name ILIKE $${params.length} OR pu.name ILIKE $${params.length} OR sc.name ILIKE $${params.length} OR b.location ILIKE $${params.length})`;
    }

    sql += ` ORDER BY b.created_at DESC LIMIT 5000`;

    const result = await query(sql, params);

    // Summary stats
    const totalAmount = result.rows.reduce((sum, r) => sum + Number(r.amount_paid || r.total_price || 0), 0);
    const totalCommission = result.rows.reduce((sum, r) => sum + Number(r.platform_commission || 0), 0);
    const avgRating = result.rows.filter(r => r.review_rating).reduce((sum, r, _, arr) => sum + Number(r.review_rating) / arr.length, 0);

    res.json({
      bookings: result.rows,
      summary: {
        total_records: result.rows.length,
        total_amount: Math.round(totalAmount),
        total_commission: Math.round(totalCommission),
        avg_rating: Math.round(avgRating * 100) / 100,
        completed: result.rows.filter(r => r.status === 'completed').length,
        pending: result.rows.filter(r => r.status === 'pending').length,
        cancelled: result.rows.filter(r => r.status === 'cancelled').length,
      }
    });
  } catch (error) {
    console.error('Get bookings export error:', error);
    res.status(500).json({ error: 'Failed to fetch export data' });
  }
};
