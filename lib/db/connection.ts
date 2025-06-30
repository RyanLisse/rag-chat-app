import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

config({
  path: '.env.local',
});

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or POSTGRES_URL must be defined');
}

// For local development with file:// URL, create a mock database
// In production, use the actual PostgreSQL URL
const isFileUrl = databaseUrl.startsWith('file:');

let db: any;

if (isFileUrl) {
  // Create a mock database for local development
  console.log('Using mock database for local development');
  db = createMockDB();
} else {
  // Use actual PostgreSQL connection
  try {
    const connection = postgres(databaseUrl, { 
      max: 1,
      connect_timeout: 5,
    });
    db = drizzle(connection, { schema });
  } catch (error) {
    console.warn('Database connection failed, using mock database');
    db = createMockDB();
  }
}

// Mock database for local development without PostgreSQL
function createMockDB() {
  const mockUser = {
    id: 'guest-user-' + Date.now(),
    email: 'guest@localhost',
    password: 'mock-hashed-password',
    createdAt: new Date(),
  };

  const mockDB = {
    select: () => ({
      from: (table: any) => ({
        where: (condition: any) => {
          // Return mock user for auth queries
          if (table === schema.user) {
            return Promise.resolve([mockUser]);
          }
          return Promise.resolve([]);
        },
        limit: () => Promise.resolve([]),
        orderBy: () => Promise.resolve([]),
      }),
    }),
    insert: (table: any) => ({
      values: (values: any) => {
        if (table === schema.user) {
          return {
            returning: () => Promise.resolve([{ ...mockUser, ...values }]),
          };
        }
        return {
          returning: () => Promise.resolve([{ id: 'mock-id', ...values }]),
        };
      },
    }),
    update: () => ({
      set: () => ({
        where: () => Promise.resolve([]),
      }),
    }),
    delete: () => ({
      where: () => Promise.resolve([]),
    }),
  };

  return mockDB;
}

export { db };
export const databaseType = isFileUrl ? 'mock' : 'postgres';