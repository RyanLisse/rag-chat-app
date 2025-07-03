import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({
  path: '.env.local',
});

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

// Determine which database we're using
const isPostgres = databaseUrl?.startsWith('postgres');
const isSQLite = databaseUrl?.startsWith('file:');
const isTurso = !!tursoUrl;

if (!databaseUrl && !tursoUrl) {
  throw new Error(
    'DATABASE_URL, POSTGRES_URL, or TURSO_DATABASE_URL must be defined'
  );
}

// Use different config based on database type
const configs = {
  postgres: {
    schema: './lib/db/schema.ts',
    out: './lib/db/migrations',
    dialect: 'postgresql' as const,
    dbCredentials: { url: databaseUrl! },
  },
  sqlite: {
    schema: './lib/db/schema.ts',
    out: './lib/db/migrations',
    dialect: 'sqlite' as const,
    dbCredentials: { url: databaseUrl?.replace('file:', '') },
  },
  turso: {
    schema: './lib/db/turso-schema.ts',
    out: './lib/db/turso-migrations',
    dialect: 'turso' as const,
    dbCredentials: {
      url: tursoUrl!,
      authToken: tursoAuthToken,
    },
  },
};

const activeConfig = isTurso
  ? configs.turso
  : isPostgres
    ? configs.postgres
    : configs.sqlite;

export default defineConfig(activeConfig);
