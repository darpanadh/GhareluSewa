import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool, Client } = pg;

const isProductionOrCloud = process.env.DATABASE_URL || process.env.DB_SSL === 'true';

const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: isProductionOrCloud ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'gharelu_sewa',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: isProductionOrCloud ? { rejectUnauthorized: false } : false,
    };

// Ensure database exists (Only for local localhost setups)
const ensureDatabaseExists = async () => {
  if (process.env.DATABASE_URL || process.env.DB_HOST !== 'localhost') {
    return; // Skip auto database creation when connecting to cloud DBs like Supabase
  }
  const masterClient = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: 'postgres',
  });
  try {
    await masterClient.connect();
    const res = await masterClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbConfig.database]
    );
    if (res.rows.length === 0) {
      await masterClient.query(`CREATE DATABASE "${dbConfig.database}"`);
      console.log(`✅ Created database "${dbConfig.database}"`);
    }
  } catch (err) {
    console.warn('⚠️ Master DB connection check failed:', err.message);
  } finally {
    await masterClient.end().catch(() => {});
  }
};

await ensureDatabaseExists();

let pool = null;

try {
  pool = new Pool({
    ...dbConfig,
    connectionTimeoutMillis: 10000,
  });
  
  // Test connection
  pool.on('error', (err) => {
    console.error('⚠️ PostgreSQL connection error:', err.message);
  });
} catch (err) {
  console.error('⚠️ Could not initialize PostgreSQL Pool:', err.message);
}

export const query = async (text, params = []) => {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error('⚠️ SQL Query failed on Postgres:', err.message);
    throw err;
  }
};

export const getPool = () => pool;

export default pool;
