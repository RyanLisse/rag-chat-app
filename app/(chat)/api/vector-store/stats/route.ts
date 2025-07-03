import { NextResponse } from 'next/server';
import OpenAI from 'openai';

import { auth } from '@/app/(auth)/auth';
import { redis } from '@/lib/db/redis';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache key prefixes
const CACHE_PREFIX = {
  SEARCH_HISTORY: 'vector_store:search_history:',
  UPLOAD_HISTORY: 'vector_store:upload_history:',
  STATS: 'vector_store:stats',
};

// Types
interface SearchRecord {
  query: string;
  timestamp: Date;
  resultCount: number;
  userId?: string;
}

interface UploadRecord {
  filename: string;
  timestamp: Date;
  status: 'completed' | 'processing' | 'failed';
  size: number;
  fileId?: string;
}

export async function GET(_request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const vectorStoreId = process.env.OPENAI_VECTORSTORE_ID;

    if (!vectorStoreId) {
      return NextResponse.json({
        totalDocuments: 0,
        totalSize: 0,
        lastUpdated: new Date(),
        status: 'disconnected',
        processingFiles: 0,
        completedFiles: 0,
        failedFiles: 0,
        recentSearches: [],
        recentUploads: [],
      });
    }

    // Try to get vector store info
    let vectorStoreStatus: 'connected' | 'disconnected' | 'error' = 'connected';
    const fileStats = {
      total: 0,
      completed: 0,
      processing: 0,
      failed: 0,
      totalSize: 0,
    };

    try {
      // Get vector store details
      const _vectorStore = await openai.vectorStores.retrieve(vectorStoreId);

      // Get file list with pagination handling
      let hasMore = true;
      let after: string | undefined;
      const allFiles: any[] = [];

      while (hasMore) {
        const files = await openai.vectorStores.files.list(vectorStoreId, {
          limit: 100,
          after,
        });

        allFiles.push(...files.data);
        hasMore = files.has_more;
        if (hasMore && files.data.length > 0) {
          after = files.data[files.data.length - 1].id;
        }
      }

      // Calculate file statistics
      fileStats.total = allFiles.length;

      for (const file of allFiles) {
        if (file.status === 'completed') {
          fileStats.completed++;
        } else if (file.status === 'in_progress') {
          fileStats.processing++;
        } else if (file.status === 'failed') {
          fileStats.failed++;
        }

        // Try to get file size (this might not be available from vector store file object)
        try {
          const fileDetails = await openai.files.retrieve(file.id);
          fileStats.totalSize += fileDetails.bytes || 0;
        } catch {
          // File might be deleted from Files API but still in vector store
        }
      }
    } catch (error) {
      console.error('Error accessing vector store:', error);
      vectorStoreStatus = 'error';
    }

    // Get recent searches from Redis cache
    let recentSearches: SearchRecord[] = [];
    try {
      const searchKey = `${CACHE_PREFIX.SEARCH_HISTORY}${session.user?.id || 'global'}`;
      const searches = await redis.lrange(searchKey, 0, 9); // Get last 10 searches
      recentSearches = searches
        .map((search) => {
          try {
            return JSON.parse(search);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .map((search) => ({
          ...search,
          timestamp: new Date(search.timestamp),
        }));
    } catch (error) {
      console.error('Error fetching search history:', error);
    }

    // Get recent uploads from Redis cache
    let recentUploads: UploadRecord[] = [];
    try {
      const uploadKey = `${CACHE_PREFIX.UPLOAD_HISTORY}${session.user?.id || 'global'}`;
      const uploads = await redis.lrange(uploadKey, 0, 9); // Get last 10 uploads
      recentUploads = uploads
        .map((upload) => {
          try {
            return JSON.parse(upload);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .map((upload) => ({
          ...upload,
          timestamp: new Date(upload.timestamp),
        }));
    } catch (error) {
      console.error('Error fetching upload history:', error);
    }

    // Get or calculate last updated timestamp
    let lastUpdated = new Date();
    try {
      if (redis) {
        const statsKey = CACHE_PREFIX.STATS;
        const stats = await redis.get(statsKey);
        if (stats) {
          const parsedStats = JSON.parse(stats);
          lastUpdated = new Date(parsedStats.lastUpdated);
        } else {
          // Set initial stats
          await redis.set(
            statsKey,
            JSON.stringify({ lastUpdated: new Date() }),
            'EX',
            3600 // 1 hour TTL
          );
        }
      }
    } catch (error) {
      console.error('Error managing stats cache:', error);
    }

    const response = {
      totalDocuments: fileStats.completed,
      totalSize: fileStats.totalSize,
      lastUpdated,
      status: vectorStoreStatus,
      processingFiles: fileStats.processing,
      completedFiles: fileStats.completed,
      failedFiles: fileStats.failed,
      recentSearches,
      recentUploads,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Vector store stats error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch vector store statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Helper endpoint to record search activity
export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, data } = body;

    if (!redis) {
      return NextResponse.json({ success: true }); // Silently succeed if Redis not available
    }

    const userId = session.user?.id || 'global';

    if (type === 'search') {
      const searchRecord: SearchRecord = {
        query: data.query,
        timestamp: new Date(),
        resultCount: data.resultCount || 0,
        userId,
      };

      const searchKey = `${CACHE_PREFIX.SEARCH_HISTORY}${userId}`;
      await redis.lpush(searchKey, JSON.stringify(searchRecord));
      await redis.ltrim(searchKey, 0, 49); // Keep last 50 searches
      await redis.expire(searchKey, 86400 * 7); // 7 days TTL
    } else if (type === 'upload') {
      const uploadRecord: UploadRecord = {
        filename: data.filename,
        timestamp: new Date(),
        status: data.status || 'processing',
        size: data.size || 0,
        fileId: data.fileId,
      };

      const uploadKey = `${CACHE_PREFIX.UPLOAD_HISTORY}${userId}`;
      await redis.lpush(uploadKey, JSON.stringify(uploadRecord));
      await redis.ltrim(uploadKey, 0, 49); // Keep last 50 uploads
      await redis.expire(uploadKey, 86400 * 7); // 7 days TTL
    }

    // Update last updated timestamp
    const statsKey = CACHE_PREFIX.STATS;
    await redis.set(
      statsKey,
      JSON.stringify({ lastUpdated: new Date() }),
      'EX',
      3600
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording activity:', error);
    return NextResponse.json(
      {
        error: 'Failed to record activity',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
