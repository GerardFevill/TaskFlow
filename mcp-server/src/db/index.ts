import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema/index.js';

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'avalis',
  password: process.env.DB_PASSWORD || 'avalis',
  database: process.env.DB_NAME || 'gestion_projet',
});

export const db = drizzle(pool, { schema });
export { pool };
