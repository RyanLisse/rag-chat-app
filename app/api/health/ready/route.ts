import { NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring';

interface ReadinessStatus {
  ready: boolean;
  timestamp: string;
  checks: {
    database: boolean;
    environment: boolean;
    dependencies: boolean;
  };
  details?: Record<string, any>;
}

export async function GET() {
  try {
    // Check if required environment variables are set
    const requiredEnvVars = [
      'POSTGRES_URL',
      'AUTH_SECRET',
      'BLOB_READ_WRITE_TOKEN',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );
    const environmentReady = missingEnvVars.length === 0;

    // Check if at least one AI provider is configured
    const aiProvidersConfigured = !!(
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.XAI_API_KEY
    );

    // Quick database connectivity check
    let databaseReady = false;
    try {
      const { default: postgres } = await import('postgres');
      const sql = postgres(process.env.POSTGRES_URL!);
      await sql`SELECT 1`;
      await sql.end();
      databaseReady = true;
    } catch (error) {
      logger.warn('Database not ready', { error: (error as Error).message });
    }

    const isReady = environmentReady && aiProvidersConfigured && databaseReady;

    const readiness: ReadinessStatus = {
      ready: isReady,
      timestamp: new Date().toISOString(),
      checks: {
        database: databaseReady,
        environment: environmentReady,
        dependencies: aiProvidersConfigured,
      },
    };

    // Add details if not ready
    if (!isReady) {
      readiness.details = {
        missingEnvVars: missingEnvVars.length > 0 ? missingEnvVars : undefined,
        aiProviders: !aiProvidersConfigured
          ? 'No AI provider API keys configured'
          : undefined,
        database: !databaseReady ? 'Unable to connect to database' : undefined,
      };
    }

    logger.info('Readiness check performed', {
      ready: readiness.ready,
      checks: readiness.checks,
    });

    return NextResponse.json(readiness, {
      status: isReady ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.error('Readiness check failed', {}, error as Error);

    return NextResponse.json(
      {
        ready: false,
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      },
      {
        status: 503,
      }
    );
  }
}
