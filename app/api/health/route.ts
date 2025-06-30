import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const runtime = 'edge';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: CheckResult;
    redis?: CheckResult;
    storage?: CheckResult;
  };
}

interface CheckResult {
  status: 'pass' | 'fail';
  message?: string;
  responseTime?: number;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Simple query to check database connectivity
    await db.execute(sql`SELECT 1`);
    return {
      status: 'pass',
      responseTime: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Database check failed',
      responseTime: Date.now() - start
    };
  }
}

async function checkRedis(): Promise<CheckResult> {
  // Implement Redis health check if using Redis
  // For now, return a pass since it's optional
  return {
    status: 'pass',
    message: 'Redis check not implemented'
  };
}

async function checkStorage(): Promise<CheckResult> {
  // Implement blob storage health check if needed
  return {
    status: 'pass',
    message: 'Storage check not implemented'
  };
}

export async function GET() {
  try {
    const [databaseCheck, redisCheck, storageCheck] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkStorage()
    ]);

    const allChecksPass = 
      databaseCheck.status === 'pass' &&
      redisCheck.status === 'pass' &&
      storageCheck.status === 'pass';

    const healthStatus: HealthStatus = {
      status: allChecksPass ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '3.0.23',
      checks: {
        database: databaseCheck,
        redis: redisCheck,
        storage: storageCheck
      }
    };

    return NextResponse.json(healthStatus, {
      status: allChecksPass ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Health-Check': allChecksPass ? 'pass' : 'fail'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed'
      },
      { 
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Health-Check': 'fail'
        }
      }
    );
  }
}