import { query } from '../config/database.js';

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, ward, bio, avatar_url } = req.body;

    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           phone = COALESCE($2, phone),
           ward = COALESCE($3, ward),
           bio = COALESCE($4, bio),
           avatar_url = COALESCE($5, avatar_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, name, email, phone, role, ward, avatar_url, bio`,
      [name, phone, ward, bio, avatar_url, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.ward, u.avatar_url, u.bio, u.is_verified, u.created_at,
              pp.hourly_rate, pp.rating_avg, pp.total_reviews, pp.availability, pp.background_check_status, pp.skill_badges, pp.service_wards,
              sc.name as service_category
       FROM users u
       LEFT JOIN provider_profiles pp ON u.id = pp.user_id
       LEFT JOIN service_categories sc ON pp.category_id = sc.id
       WHERE u.id = $1 AND u.is_active = TRUE`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Get all providers (with filtering)
export const getAllProviders = async (req, res) => {
  try {
    const { category_id, ward, rating_min } = req.query;

    let sql = `
      SELECT u.id, u.name, u.email, u.phone, u.role, u.ward, u.avatar_url, u.bio,
             pp.hourly_rate, pp.rating_avg, pp.total_reviews, pp.availability, pp.background_check_status, pp.skill_badges, pp.service_wards,
             sc.name as service_category, sc.id as category_id
      FROM users u
      JOIN provider_profiles pp ON u.id = pp.user_id
      JOIN service_categories sc ON pp.category_id = sc.id
      WHERE u.is_active = TRUE AND u.is_verified = TRUE AND pp.availability = TRUE
    `;

    const params = [];

    if (category_id) {
      sql += ` AND pp.category_id = $${params.length + 1}`;
      params.push(category_id);
    }

    if (ward) {
      const cityMatch = ward.match(/^(Kathmandu|Pokhara|Bharatpur)/i);
      const cityName = cityMatch ? cityMatch[1] : ward.split(' ')[0];
      sql += ` AND (u.ward = $${params.length + 1} OR u.ward ILIKE $${params.length + 2} OR pp.service_wards ILIKE $${params.length + 3} OR pp.service_wards ILIKE $${params.length + 4})`;
      params.push(ward, `${cityName}%Whole City%`, `%${ward}%`, `%Whole City%`);
    }

    if (rating_min) {
      sql += ` AND pp.rating_avg >= $${params.length + 1}`;
      params.push(rating_min);
    }

    sql += ` ORDER BY pp.rating_avg DESC LIMIT 50`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
};

// Get providers by ward (for emergency booking)
export const getProvidersByWard = async (req, res) => {
  try {
    const { ward, category_id } = req.params;
    const cityMatch = ward.match(/^(Kathmandu|Pokhara|Bharatpur)/i);
    const cityName = cityMatch ? cityMatch[1] : ward.split(' ')[0];

    const sql = `SELECT u.id, u.name, u.phone, u.avatar_url, pp.hourly_rate, pp.rating_avg, pp.availability, pp.service_wards
       FROM users u
       JOIN provider_profiles pp ON u.id = pp.user_id
       WHERE (u.ward = $1 OR u.ward ILIKE $2 OR pp.service_wards ILIKE $3 OR pp.service_wards ILIKE $4) AND u.is_active = TRUE AND u.is_verified = TRUE AND pp.availability = TRUE
       ${category_id ? 'AND pp.category_id = $5' : ''}
       ORDER BY pp.rating_avg DESC`;

    const params = category_id ? [ward, `${cityName}%Whole City%`, `%${ward}%`, `%Whole City%`, category_id] : [ward, `${cityName}%Whole City%`, `%${ward}%`, `%Whole City%`];

    const result = await query(sql, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Get providers by ward error:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
};

// Search users (admin)
export const searchUsers = async (req, res) => {
  try {
    const { search, role, is_verified } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    let sql = 'SELECT id, name, email, phone, role, ward, is_verified, created_at FROM users WHERE 1=1';
    const params = [];

    if (search) {
      sql += ` AND (name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (role) {
      sql += ` AND role = $${params.length + 1}`;
      params.push(role);
    }

    if (is_verified !== undefined) {
      sql += ` AND is_verified = $${params.length + 1}`;
      params.push(is_verified === 'true');
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};
