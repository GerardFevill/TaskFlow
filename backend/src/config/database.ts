import pg from 'pg';
import { env } from './environment.js';

const { Pool } = pg;

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
});

export async function testConnection(retries = 10): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connected');
      return;
    } catch (err) {
      console.log(`Waiting for PostgreSQL... (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('Unable to connect to PostgreSQL');
}
