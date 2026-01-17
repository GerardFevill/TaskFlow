import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from '../config/database.js';
import * as schema from './schema/index.js';

export const db = drizzle(pool, { schema });

export { pool };
export * from './schema/index.js';
