import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({
  path: '.env.local',
});

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// Determine if we're using SQLite or PostgreSQL
const isPostgres = databaseUrl?.startsWith('postgres');
const isSQLite = databaseUrl?.startsWith('file:');

if (!databaseUrl) {
  throw new Error('DATABASE_URL or POSTGRES_URL must be defined');
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: isPostgres ? 'postgresql' : 'sqlite',
  dbCredentials: isPostgres 
    ? { url: databaseUrl }
    : { url: databaseUrl.replace('file:', '') },
});