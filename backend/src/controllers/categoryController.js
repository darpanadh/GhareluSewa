import { query } from '../config/database.js';

// Get all service categories
export const getAllCategories = async (req, res) => {
  try {
    const result = await query(`
      SELECT sc.id, sc.name, sc.icon, sc.description,
             COUNT(DISTINCT pp.user_id)::int as provider_count
      FROM service_categories sc
      LEFT JOIN provider_profiles pp ON sc.id = pp.category_id
      LEFT JOIN users u ON pp.user_id = u.id AND u.is_active = TRUE AND u.is_verified = TRUE
      GROUP BY sc.id, sc.name, sc.icon, sc.description
      ORDER BY sc.id ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Create service category (admin only)
export const createCategory = async (req, res) => {
  try {
    const { name, icon, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name required' });
    }

    const result = await query(
      'INSERT INTO service_categories (name, icon, description) VALUES ($1, $2, $3) RETURNING *',
      [name, icon, description]
    );

    res.status(201).json({
      message: 'Category created successfully',
      category: result.rows[0],
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

// Update service category (admin only)
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, description } = req.body;

    const result = await query(
      `UPDATE service_categories 
       SET name = COALESCE($1, name), 
           icon = COALESCE($2, icon),
           description = COALESCE($3, description)
       WHERE id = $4
       RETURNING *`,
      [name, icon, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({
      message: 'Category updated successfully',
      category: result.rows[0],
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

// Delete service category (admin only)
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM service_categories WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

// Get providers by category
export const getProvidersByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const result = await query(
      `SELECT u.id, u.name, u.phone, u.avatar_url, u.ward, u.bio,
              pp.hourly_rate, pp.rating_avg, pp.total_reviews, pp.availability
       FROM users u
       JOIN provider_profiles pp ON u.id = pp.user_id
       WHERE pp.category_id = $1 AND u.is_active = TRUE AND u.is_verified = TRUE
       ORDER BY pp.rating_avg DESC`,
      [categoryId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get providers by category error:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
};
