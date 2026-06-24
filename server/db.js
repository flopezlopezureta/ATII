import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

// Enable SSL only if explicitly requested in the connection string or via environment variable
const sslEnabled = connectionString && (
  connectionString.includes('sslmode=require') ||
  connectionString.includes('ssl=true') ||
  process.env.DB_SSL === 'true'
);

export const pool = new Pool({
  connectionString,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
});

export const query = (text, params) => pool.query(text, params);

