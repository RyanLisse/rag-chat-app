import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({
  path: '.env.local',
});

const runMigrate = async () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or POSTGRES_URL must be defined');
  }

  const isFileUrl = databaseUrl.startsWith('file:');

  console.log('⏳ Running migrations...');

  if (isFileUrl) {
    console.log('Mock database detected - skipping migrations for local development');
    console.log('✅ Mock database ready for local development');
    return;
  }

  console.log('Database type: PostgreSQL');

  const start = Date.now();

  try {
    const connection = postgres(databaseUrl, { max: 1 });
    const db = drizzle(connection);
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    await connection.end();

    const end = Date.now();
    console.log('✅ Migrations completed in', end - start, 'ms');
  } catch (error) {
    console.error('❌ Migration failed');
    console.error(error);
    process.exit(1);
  }
};

runMigrate();