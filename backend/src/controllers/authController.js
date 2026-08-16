import { query } from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';

// Register user
export const register = async (req, res) => {
  try {
    const { name, email, phone, password, role, ward } = req.body;

    // Validate input
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Full Name Validation: Trimmed length must be between 2 and 70 characters (allowing all Unicode characters)
    const trimmedName = name ? name.trim() : '';
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 70) {
      return res.status(400).json({ error: 'Full name must be between 2 and 70 characters' });
    }

    // Email Validation: Pattern /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const trimmedEmail = email ? email.trim() : '';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }

    if (!['customer', 'provider', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user exists
    const userCheck = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const result = await query(
      `INSERT INTO users (name, email, phone, password_hash, role, ward, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role, created_at`,
      [name, email, phone || null, password_hash, role, ward || null, role === 'admin']
    );

    const user = result.rows[0];

    // If role is provider, create a provider profile entry
    if (role === 'provider') {
      const categoryId = req.body.categoryId || 1;
      const hourlyRate = req.body.hourlyRate || 500;
      const bio = req.body.bio || '';
      const citizenshipNo = req.body.citizenshipNo || null;
      const citizenshipImageUrl = req.body.citizenship_image_url || req.body.citizenshipImageUrl || null;

      await query(
        `INSERT INTO provider_profiles (user_id, category_id, hourly_rate, availability, citizenship_no, citizenship_image_url)
         VALUES ($1, $2, $3, true, $4, $5)`,
        [user.id, categoryId, hourlyRate, citizenshipNo, citizenshipImageUrl]
      );

      if (bio) {
        await query(
          `UPDATE users SET bio = $1, is_verified = false WHERE id = $2`,
          [bio, user.id]
        );
      }
    }

    const token = generateToken(user.id, role);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user (case-insensitive email matching and trimmed input)
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const result = await query(
      'SELECT id, name, email, password_hash, role, is_verified, is_active FROM users WHERE LOWER(email) = LOWER($1)',
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await comparePassword(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check account status / KYC rejection
    if (!user.is_active) {
      if (user.role === 'provider') {
        return res.status(403).json({
          error: 'Your KYC application was not approved during review. Please re-verify your KYC details or submit updated identity documents.',
          is_kyc_rejected: true,
        });
      }
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    // Update last login
    await query('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.ward, u.avatar_url, u.bio, u.is_verified,
              pp.hourly_rate, pp.rating_avg, pp.total_reviews, pp.availability
       FROM users u
       LEFT JOIN provider_profiles pp ON u.id = pp.user_id
       WHERE u.id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Re-verify provider KYC
export const reverifyKYC = async (req, res) => {
  try {
    const { email, password, name, phone, ward, categoryId, hourlyRate, bio, citizenshipNo, citizenship_image_url } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required to re-verify KYC' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userResult = await query(
      'SELECT id, name, email, password_hash, role FROM users WHERE LOWER(email) = LOWER($1)',
      [cleanEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found with this email' });
    }

    const user = userResult.rows[0];

    if (user.role !== 'provider') {
      return res.status(400).json({ error: 'Only service providers can submit KYC re-verification' });
    }

    const validPassword = await comparePassword(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password. Please enter your correct account password.' });
    }

    // Reactivate user and set is_verified to false so it goes back to admin queue
    await query(
      `UPDATE users
       SET is_active = TRUE,
           is_verified = FALSE,
           name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           ward = COALESCE($3, ward),
           bio = COALESCE($4, bio),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [name || null, phone || null, ward || null, bio || null, user.id]
    );

    // Update or insert provider profile
    const profileCheck = await query('SELECT id FROM provider_profiles WHERE user_id = $1', [user.id]);
    
    if (profileCheck.rows.length > 0) {
      await query(
        `UPDATE provider_profiles
         SET category_id = COALESCE($1, category_id),
             hourly_rate = COALESCE($2, hourly_rate),
             citizenship_no = COALESCE($3, citizenship_no),
             citizenship_image_url = COALESCE($4, citizenship_image_url),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $5`,
        [categoryId ? parseInt(categoryId) : null, hourlyRate ? parseFloat(hourlyRate) : null, citizenshipNo || null, citizenship_image_url || null, user.id]
      );
    } else {
      await query(
        `INSERT INTO provider_profiles (user_id, category_id, hourly_rate, availability, citizenship_no, citizenship_image_url)
         VALUES ($1, $2, $3, true, $4, $5)`,
        [user.id, categoryId ? parseInt(categoryId) : 1, hourlyRate ? parseFloat(hourlyRate) : 500, citizenshipNo || null, citizenship_image_url || null]
      );
    }

    res.json({
      success: true,
      message: 'KYC re-verification submitted successfully. Awaiting admin approval.',
    });
  } catch (error) {
    console.error('KYC reverify error:', error);
    res.status(500).json({ error: 'Failed to submit KYC re-verification' });
  }
};

