# Agent Configuration

## Project Overview
RAG Chat Application - Next.js 15 with AI SDK, OpenAI Vector Store, and comprehensive citation support.

## Essential Commands
- `bun install` - Install dependencies
- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run test` - Run unit tests
- `bun run test:e2e` - Run E2E tests
- `bun run lint` - Run linting
- `bun run typecheck` - Type check
- `bun run db:migrate` - Run database migrations

## Project Structure
- `app/` - Next.js 15 App Router
- `components/` - React components
- `lib/` - Utilities and AI providers
- `tests/` - Test suites (unit, integration, e2e)
- `docs/` - Documentation

## Key Technologies
- Next.js 15 with Turbopack
- AI SDK 5.0 with multiple providers
- Turso DB (SQLite edge)
- OpenAI Vector Store
- Drizzle ORM
- Biome for linting

## Environment Setup
Copy `.env.local.example` to `.env.local` and configure API keys.

## Testing
Run `bun run test:fast` for quick tests. Full test suite available via `bun run test:ci`.

## Code Standards
- TypeScript throughout
- Biome for formatting/linting
- Comprehensive test coverage required