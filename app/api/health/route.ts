import { databaseType } from '@/lib/db/connection';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: databaseType,
      environment: process.env.NODE_ENV,
      features: {
        turso: databaseType === 'turso',
        postgres: databaseType === 'postgres',
        mock: databaseType === 'mock',
      },
    };

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
