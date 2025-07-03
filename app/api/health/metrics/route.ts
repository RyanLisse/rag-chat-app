import { NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring';

interface Metrics {
  timestamp: string;
  process: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
    pid: number;
    version: string;
  };
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
  };
  application: {
    environment: string;
    version: string;
  };
}

export async function GET(request: Request) {
  try {
    // Check if metrics endpoint is protected
    const authHeader = request.headers.get('authorization');
    const metricsToken = process.env.METRICS_AUTH_TOKEN;

    if (metricsToken && authHeader !== `Bearer ${metricsToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metrics: Metrics = {
      timestamp: new Date().toISOString(),
      process: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        pid: process.pid,
        version: process.version,
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
      },
      application: {
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
      },
    };

    logger.info('Metrics endpoint accessed');

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.error('Metrics endpoint failed', {}, error as Error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
      }
    );
  }
}
