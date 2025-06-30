# Turso Database Setup Guide

This application now supports Turso DB as an alternative to PostgreSQL for local development.

## Setup Options

### Option 1: Local Turso Database (Recommended for Development)

1. Install Turso CLI:
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

2. Create a local database:
```bash
turso dev
```

3. Set environment variables in `.env.local`:
```env
# For local Turso database
TURSO_DATABASE_URL=http://localhost:8080

# Or for remote Turso database
# TURSO_DATABASE_URL=libsql://your-database.turso.io
# TURSO_AUTH_TOKEN=your-auth-token
```

### Option 2: Remote Turso Database

1. Sign up at https://turso.tech

2. Create a new database:
```bash
turso db create your-database-name
```

3. Get your database URL and auth token:
```bash
turso db show your-database-name --url
turso db tokens create your-database-name
```

4. Set environment variables in `.env.local`:
```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

## Running Migrations

Generate and run Turso migrations:
```bash
# Generate migrations
bun run db:generate

# Run migrations
bun run db:migrate
```

## Database Selection Priority

The application checks for databases in this order:
1. Turso (if `TURSO_DATABASE_URL` is set)
2. PostgreSQL (if `DATABASE_URL` or `POSTGRES_URL` is set)
3. Mock database (if `DATABASE_URL` starts with `file:`)

## Schema Differences

The Turso schema (`lib/db/turso-schema.ts`) uses SQLite-compatible types:
- `uuid` → `text` with UUID generation
- `timestamp` → `text` with ISO string dates
- `boolean` → `integer` with mode 'boolean'
- `json` → `text` with mode 'json'

## Switching Between Databases

To switch between databases, simply update your environment variables:
- For Turso: Set `TURSO_DATABASE_URL`
- For PostgreSQL: Set `DATABASE_URL` or `POSTGRES_URL`
- For Mock: Set `DATABASE_URL=file:mock.db`

The application will automatically use the appropriate schema and connection type.