import { NextResponse } from 'next/server';

// Simple liveness check - just returns OK if the process is running
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptime: process.uptime(),
    },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}
