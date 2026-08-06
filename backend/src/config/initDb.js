import { query } from '../config/database.js';

export const initializeDatabase = async () => {
  try {
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) CHECK (role IN ('customer', 'provider', 'admin')),
        ward VARCHAR(100),
        avatar_url TEXT,
        bio TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create service_categories table
    await query(`
      CREATE TABLE IF NOT EXISTS service_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        icon VARCHAR(100),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create provider_profiles table
    await query(`
      CREATE TABLE IF NOT EXISTS provider_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES service_categories(id),
        hourly_rate DECIMAL(10, 2),
        availability BOOLEAN DEFAULT TRUE,
        rating_avg DECIMAL(3, 2) DEFAULT 0,
        total_reviews INTEGER DEFAULT 0,
        citizenship_no VARCHAR(100),
        citizenship_image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Alter table to add new columns if they were created before this update
    try {
      await query(`ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS citizenship_no VARCHAR(100)`);
      await query(`ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS citizenship_image_url TEXT`);
      await query(`ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS skill_badges TEXT DEFAULT ''`);
      await query(`ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS background_check_status VARCHAR(50) DEFAULT 'pending'`);
      await query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photo_url TEXT`);
      await query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS completion_status VARCHAR(100) DEFAULT 'completed_on_time'`);
      await query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_repeated_customer BOOLEAN DEFAULT FALSE`);
      await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_price DECIMAL(10, 2) DEFAULT 650`);
    } catch (e) {
      console.log('Columns already exist or error adding them:', e.message);
    }

    // Create bookings table
    await query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES service_categories(id),
        status VARCHAR(50) CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
        booking_date TIMESTAMP NOT NULL,
        location VARCHAR(255) NOT NULL,
        description TEXT,
        is_emergency BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create reviews table
    await query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create messages table
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create notifications table
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        type VARCHAR(50),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create payments table (eSewa integration)
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        customer_id INTEGER NOT NULL REFERENCES users(id),
        provider_id INTEGER NOT NULL REFERENCES users(id),
        amount DECIMAL(10, 2) NOT NULL,
        commission DECIMAL(10, 2) NOT NULL,
        provider_payout DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'esewa',
        esewa_ref_id VARCHAR(255),
        esewa_oid VARCHAR(255) UNIQUE,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create payout_requests table
    await query(`
      CREATE TABLE IF NOT EXISTS payout_requests (
        id VARCHAR(100) PRIMARY KEY,
        provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_name VARCHAR(255),
        provider_email VARCHAR(255),
        category VARCHAR(100),
        amount DECIMAL(10, 2) NOT NULL,
        method VARCHAR(50) DEFAULT 'eSewa',
        account_details TEXT,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      )
    `);

    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)`);
    } catch(e) { /* indexes may already exist */ }


    // Create indexes for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_provider_profiles_user_id ON provider_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_provider_profiles_category_id ON provider_profiles(category_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
      CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON reviews(provider_id);
      CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON messages(booking_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    `);

    // Seed Categories
    await query(`
      INSERT INTO service_categories (id, name, icon, description) VALUES
      (1, 'Plumbing', 'Wrench', 'Leaking pipes, tap repair, installations'),
      (2, 'Electrical', 'Zap', 'Wiring, switches, lights, appliances'),
      (3, 'Cleaning', 'Home', 'Deep clean, kitchen clean, disinfection'),
      (4, 'AC Service', 'Wind', 'AC repair, servicing, installation')
      ON CONFLICT (id) DO NOTHING
    `);

    // Seed Users (Password is 'password')
    await query(`
      INSERT INTO users (id, name, email, phone, password_hash, role, ward, avatar_url, bio, is_verified) VALUES
      (1, 'Admin User', 'admin@gharelusewa.com', '9801234567', '$2a$10$n38mLJi1G9Gsg1mu97vJ8O9oKWS10Bucsxz0Jp33cITuMb0EVj2Da', 'admin', 'Kathmandu Ward No. 10', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', 'Platform Administrator', true),
      (2, 'Rajesh Shrestha', 'rajesh@gmail.com', '9841123456', '$2a$10$n38mLJi1G9Gsg1mu97vJ8O9oKWS10Bucsxz0Jp33cITuMb0EVj2Da', 'provider', 'Pokhara Ward No. 12', 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150', 'Professional plumber with over 10 years of experience in leak repairs.', true),
      (3, 'Priya M.', 'priya@gmail.com', '9813987654', '$2a$10$n38mLJi1G9Gsg1mu97vJ8O9oKWS10Bucsxz0Jp33cITuMb0EVj2Da', 'customer', 'Pokhara Ward No. 12', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'Homeowner looking for reliable services', true)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true, ward = EXCLUDED.ward
    `);
    
    // Seed Provider Profile
    await query(`
      INSERT INTO provider_profiles (id, user_id, category_id, hourly_rate, availability, rating_avg, total_reviews) VALUES
      (1, 2, 1, 600, true, 4.9, 142)
      ON CONFLICT (id) DO NOTHING
    `);

    // Reset sequence values
    await query(`SELECT setval(pg_get_serial_sequence('service_categories', 'id'), COALESCE(max(id), 1)) FROM service_categories`);
    await query(`SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(max(id), 1)) FROM users`);
    await query(`SELECT setval(pg_get_serial_sequence('provider_profiles', 'id'), COALESCE(max(id), 1)) FROM provider_profiles`);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.warn('⚠️ Database initialization warning (Server will proceed with fallback data store):', error.message);
  }
};
