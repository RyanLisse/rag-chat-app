import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import { drizzle as drizzleTurso } from 'drizzle-orm/libsql';
import { migrate as migrateTurso } from 'drizzle-orm/libsql/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({
  path: '.env.local',
});

const runMigrate = async () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

  if (!databaseUrl && !tursoUrl) {
    throw new Error(
      'DATABASE_URL, POSTGRES_URL, or TURSO_DATABASE_URL must be defined'
    );
  }

  const isTurso = !!tursoUrl;
  const isFileUrl = databaseUrl?.startsWith('file:');
  const isPostgres = databaseUrl?.startsWith('postgres');

  console.log('⏳ Running migrations...');

  if (!isTurso && isFileUrl) {
    console.log(
      'Mock database detected - skipping migrations for local development'
    );
    console.log('✅ Mock database ready for local development');
    return;
  }

  const start = Date.now();

  try {
    if (isTurso) {
      console.log('Database type: Turso');
      const client = createClient({
        url: tursoUrl,
        authToken: tursoAuthToken,
      });
      const db = drizzleTurso(client);
      await migrateTurso(db, { migrationsFolder: './lib/db/turso-migrations' });
      console.log('✅ Turso migrations completed');
    } else if (isPostgres) {
      console.log('Database type: PostgreSQL');
      const connection = postgres(databaseUrl!, { max: 1 });
      const db = drizzle(connection);
      await migrate(db, { migrationsFolder: './lib/db/migrations' });
      await connection.end();
    } else {
      throw new Error('Unsupported database type');
    }

    const end = Date.now();
    console.log('✅ Migrations completed in', end - start, 'ms');
  } catch (error) {
    console.error('❌ Migration failed');
    console.error(error);
    process.exit(1);
  }
};

runMigrate();
