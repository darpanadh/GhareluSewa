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
      await query(`ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS negative_since TIMESTAMP DEFAULT NULL`);
      await query(`ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE`);
      await query(`ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS service_wards TEXT DEFAULT ''`);
      await query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photo_url TEXT`);
      await query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS completion_status VARCHAR(100) DEFAULT 'completed_on_time'`);
      await query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_repeated_customer BOOLEAN DEFAULT FALSE`);
      await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_price DECIMAL(10, 2) DEFAULT 650`);
      await query(`ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check`);
      await query(`ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending', 'accepted', 'in_progress', 'awaiting_payment', 'completed', 'cancelled'))`);

      // Sync background_check_status for existing verified providers
      await query(`
        UPDATE provider_profiles
        SET background_check_status = 'approved'
        WHERE user_id IN (SELECT id FROM users WHERE is_verified = TRUE AND role = 'provider')
          AND (background_check_status IS NULL OR background_check_status = 'pending')
      `);
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
        status VARCHAR(50) CHECK (status IN ('pending', 'accepted', 'in_progress', 'awaiting_payment', 'completed', 'cancelled')) DEFAULT 'pending',
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
      // Platform payment model — new columns
      await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'esewa'`);
      await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS manual_ref_id VARCHAR(255)`);
      await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS escrow_released BOOLEAN DEFAULT FALSE`);
      await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMP`);
    } catch(e) { /* indexes/columns may already exist */ }



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
      (4, 'AC Service', 'Wind', 'AC repair, servicing, installation'),
      (5, 'Carpentry', 'Hammer', 'Furniture repair, door fitting, woodwork'),
      (6, 'Painting', 'Paintbrush', 'Wall painting, interior & exterior finish')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, description = EXCLUDED.description
    `);

    // Seed Users (Password is 'password')
    const defaultPasswordHash = '$2a$10$teqRfVbninW74qnlE1t70uPijlHZXOuMIApnoCyJTdruqfqLTbuv2'; // bcrypt hash for 'password'
    
    const seedUsers = [
      { name: 'Admin User', email: 'admin@gharelusewa.com', phone: '9801234567', role: 'admin', ward: 'Kathmandu Ward No. 10', bio: 'Platform Administrator', is_verified: true },
      { name: 'Rajesh Shrestha', email: 'rajesh@gmail.com', phone: '9841123456', role: 'provider', ward: 'Pokhara Ward No. 6', bio: 'Professional plumber in Pokhara with over 10 years of experience in leak repairs.', is_verified: true },
      { name: 'Priya M.', email: 'priya@gmail.com', phone: '9813987654', role: 'customer', ward: 'Pokhara Ward No. 12', bio: 'Homeowner looking for reliable services', is_verified: true },
      { name: 'Admin Demo', email: 'admin@test.com', phone: '9800000001', role: 'admin', ward: 'Kathmandu Ward No. 1', bio: 'Platform Administrator', is_verified: true },
      { name: 'Provider Demo', email: 'provider@test.com', phone: '9800000002', role: 'provider', ward: 'Pokhara Ward No. 1', bio: 'Professional Plumber in Pokhara', is_verified: true },
      { name: 'Customer Demo', email: 'customer@test.com', phone: '9800000003', role: 'customer', ward: 'Kathmandu Ward No. 5', bio: 'Customer Account', is_verified: true },

      // Bharatpur Providers
      { name: 'Bikram Thapa', email: 'bikram.plumber@gharelusewa.com', phone: '9845011111', role: 'provider', ward: 'Bharatpur Ward No. 1', bio: 'Licensed master plumber in Bharatpur offering leak repair, tap fitting, and sanitation services.', is_verified: true, category_id: 1, rate: 650, rating: 4.9, reviews: 35, badges: 'Plumbing,Pipe Repair,Tap Installation,Drain Cleaning', service_wards: 'Bharatpur (Whole City)' },
      { name: 'Sujan Gurung', email: 'sujan.electric@gharelusewa.com', phone: '9845022222', role: 'provider', ward: 'Bharatpur Ward No. 5', bio: 'Certified electrical technician offering wiring, MCB setup, and switchboard repair across Bharatpur.', is_verified: true, category_id: 2, rate: 700, rating: 4.8, reviews: 28, badges: 'Wiring,Switch Installation,Circuit Repair,Lighting', service_wards: 'Bharatpur (Whole City)' },
      { name: 'Sunita Chaudhary', email: 'sunita.clean@gharelusewa.com', phone: '9845033333', role: 'provider', ward: 'Bharatpur Ward No. 2', bio: 'Professional deep cleaning specialist in Bharatpur. Sofa, carpet, and full kitchen sanitization.', is_verified: true, category_id: 3, rate: 500, rating: 4.7, reviews: 45, badges: 'Deep Clean,Kitchen Sanitization,Carpet Wash', service_wards: 'Bharatpur (Whole City)' },
      { name: 'Ramesh Adhikari', email: 'ramesh.ac@gharelusewa.com', phone: '9845044444', role: 'provider', ward: 'Bharatpur Ward No. 10', bio: 'HVAC technician specialized in AC servicing, gas refilling, and refrigerator repair.', is_verified: true, category_id: 4, rate: 800, rating: 5.0, reviews: 52, badges: 'AC Servicing,Gas Refill,Fridge Repair,Geyser Servicing', service_wards: 'Bharatpur (Whole City)' },
      { name: 'Kiran Shrestha', email: 'kiran.carpenter@gharelusewa.com', phone: '9845055555', role: 'provider', ward: 'Bharatpur Ward No. 4', bio: 'Experienced woodworker in Bharatpur for custom furniture repair, door fitting, and cabinet making.', is_verified: true, category_id: 5, rate: 600, rating: 4.6, reviews: 22, badges: 'Furniture Repair,Door Lock Fitting,Custom Cabinetry', service_wards: 'Bharatpur (Whole City)' },
      { name: 'Deepak Mahato', email: 'deepak.painter@gharelusewa.com', phone: '9845066666', role: 'provider', ward: 'Bharatpur Ward No. 7', bio: 'Interior and exterior wall painting expert in Bharatpur. Waterproofing and texture painting.', is_verified: true, category_id: 6, rate: 550, rating: 4.8, reviews: 31, badges: 'Wall Painting,Waterproofing,Texture Paint', service_wards: 'Bharatpur (Whole City)' },

      // Kathmandu Providers
      { name: 'Ram Kumar Rai', email: 'ram.plumber@gharelusewa.com', phone: '9841011111', role: 'provider', ward: 'Kathmandu Ward No. 10', bio: 'Top-rated plumber in Kathmandu Valley. Specialized in high-pressure pipe leaks and sanitary fittings.', is_verified: true, category_id: 1, rate: 750, rating: 4.9, reviews: 88, badges: 'Plumbing,Pipe Leakage,Sanitary Fitting,Overhead Tank Repair', service_wards: 'Kathmandu (Whole City)' },
      { name: 'Hari Bahadur', email: 'hari.electric@gharelusewa.com', phone: '9841022222', role: 'provider', ward: 'Kathmandu Ward No. 3', bio: 'Certified electrician with 12+ years experience across Kathmandu. Home wiring and inverter setup.', is_verified: true, category_id: 2, rate: 750, rating: 5.0, reviews: 120, badges: 'Wiring,Inverter Repair,Short Circuit Fix,Appliance Servicing', service_wards: 'Kathmandu (Whole City)' },
      { name: 'Anita Shrestha', email: 'anita.clean@gharelusewa.com', phone: '9841033333', role: 'provider', ward: 'Kathmandu Ward No. 1', bio: 'Deep home cleaning and sofa/mattress shampooing expert in Kathmandu.', is_verified: true, category_id: 3, rate: 550, rating: 4.9, reviews: 64, badges: 'House Cleaning,Sofa Washing,Deep Sanitization', service_wards: 'Kathmandu (Whole City)' },
      { name: 'Prakash Lama', email: 'prakash.ac@gharelusewa.com', phone: '9841044444', role: 'provider', ward: 'Kathmandu Ward No. 15', bio: 'Expert AC installation, duct cleaning, and inverter AC repairs in Kathmandu.', is_verified: true, category_id: 4, rate: 850, rating: 4.8, reviews: 49, badges: 'AC Servicing,Gas Filling,Duct Cleaning', service_wards: 'Kathmandu (Whole City)' },

      // Pokhara Providers
      { name: 'Bikash Rai', email: 'bikash.pokhara@gharelusewa.com', phone: '9846011111', role: 'provider', ward: 'Pokhara Ward No. 1', bio: 'Residential electrician in Pokhara. Specialist in LED lighting and panel boards.', is_verified: true, category_id: 2, rate: 650, rating: 4.7, reviews: 39, badges: 'Wiring,Lighting,Panel Fix', service_wards: 'Pokhara (Whole City)' },
      { name: 'Mira Thapa', email: 'mira.clean@gharelusewa.com', phone: '9846022222', role: 'provider', ward: 'Pokhara Ward No. 8', bio: 'Thorough deep cleaning, sanitizing, and room disinfection across Pokhara.', is_verified: true, category_id: 3, rate: 500, rating: 4.8, reviews: 67, badges: 'House Cleaning,Deep Clean,Bathroom Sanitization', service_wards: 'Pokhara (Whole City)' },
      { name: 'Suresh Magar', email: 'suresh.carpenter@gharelusewa.com', phone: '9846033333', role: 'provider', ward: 'Pokhara Ward No. 9', bio: 'Skilled carpenter for furniture, doors, and custom woodwork in Pokhara.', is_verified: true, category_id: 5, rate: 550, rating: 4.7, reviews: 29, badges: 'Carpentry,General Handyman,Door Repair', service_wards: 'Pokhara (Whole City)' }
    ];

    for (const u of seedUsers) {
      const userRes = await query(`
        INSERT INTO users (name, email, phone, password_hash, role, ward, avatar_url, bio, is_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (email) DO UPDATE SET 
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          role = EXCLUDED.role,
          ward = EXCLUDED.ward,
          bio = EXCLUDED.bio,
          is_verified = EXCLUDED.is_verified,
          is_active = true
        RETURNING id
      `, [
        u.name,
        u.email,
        u.phone,
        defaultPasswordHash,
        u.role,
        u.ward,
        `https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150`,
        u.bio,
        u.is_verified
      ]);

      const userId = userRes.rows[0]?.id;

      if (u.role === 'provider' && u.category_id && userId) {
        await query(`
          INSERT INTO provider_profiles (user_id, category_id, hourly_rate, availability, rating_avg, total_reviews, background_check_status, skill_badges, service_wards)
          VALUES ($1, $2, $3, true, $4, $5, 'approved', $6, $7)
          ON CONFLICT (user_id) DO UPDATE SET
            category_id = EXCLUDED.category_id,
            hourly_rate = EXCLUDED.hourly_rate,
            availability = true,
            rating_avg = EXCLUDED.rating_avg,
            total_reviews = EXCLUDED.total_reviews,
            background_check_status = 'approved',
            skill_badges = EXCLUDED.skill_badges,
            service_wards = EXCLUDED.service_wards
        `, [
          userId,
          u.category_id,
          u.rate || 650,
          u.rating || 4.8,
          u.reviews || 20,
          u.badges || 'Professional',
          u.service_wards || u.ward
        ]);
      }
    }

    // Reset sequence values
    await query(`SELECT setval(pg_get_serial_sequence('service_categories', 'id'), COALESCE(max(id), 1)) FROM service_categories`);
    await query(`SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(max(id), 1)) FROM users`);
    await query(`SELECT setval(pg_get_serial_sequence('provider_profiles', 'id'), COALESCE(max(id), 1)) FROM provider_profiles`);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.warn('⚠️ Database initialization warning (Server will proceed with fallback data store):', error.message);
  }
};

if (process.argv[1] && process.argv[1].includes('initDb.js')) {
  initializeDatabase().then(() => {
    console.log('Done.');
    process.exit(0);
  });
}

