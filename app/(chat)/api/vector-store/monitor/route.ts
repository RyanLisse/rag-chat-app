import { NextResponse } from 'next/server';

// In-memory stats for development
// In production, this should use Redis or a database
const stats = {
  totalSearches: 0,
  successfulSearches: 0,
  failedSearches: 0,
  totalResponseTime: 0,
  queries: [] as Array<{
    query: string;
    timestamp: string;
    responseTime: number;
    success: boolean;
  }>,
};

export async function GET() {
  const successRate =
    stats.totalSearches > 0
      ? stats.successfulSearches / stats.totalSearches
      : 1;

  const averageResponseTime =
    stats.totalSearches > 0 ? stats.totalResponseTime / stats.totalSearches : 0;

  const lastQuery = stats.queries[stats.queries.length - 1];

  return NextResponse.json({
    totalSearches: stats.totalSearches,
    successRate,
    averageResponseTime,
    lastQuery: lastQuery?.query || '',
    lastSearchTime: lastQuery?.timestamp || new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, responseTime, success } = body;

    stats.totalSearches++;
    if (success) {
      stats.successfulSearches++;
    } else {
      stats.failedSearches++;
    }

    stats.totalResponseTime += responseTime || 0;

    // Keep only last 100 queries
    if (stats.queries.length >= 100) {
      stats.queries.shift();
    }

    stats.queries.push({
      query,
      timestamp: new Date().toISOString(),
      responseTime: responseTime || 0,
      success: success || false,
    });

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to record stats' },
      { status: 500 }
    );
  }
}
