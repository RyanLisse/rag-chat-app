import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './turso-schema';

config({
  path: '.env.local',
});

// Turso connection configuration
const tursoUrl = process.env.TURSO_DATABASE_URL || 'file:local.db';
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

// Create LibSQL client
const client = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

// Create Drizzle instance with Turso
export const db = drizzle(client, { schema });
export const databaseType = 'turso';

// Export the client for migrations and direct queries if needed
export { client };