import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Request schema
const ListRequestSchema = z.object({
  vectorStoreId: z.string().optional(),
  limit: z.number().optional().default(20),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = ListRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }

    const { vectorStoreId, limit } = validation.data;

    // Get vector store ID from request or environment
    const storeId = vectorStoreId || process.env.OPENAI_VECTORSTORE_ID;

    if (!storeId) {
      return NextResponse.json(
        { error: 'Vector store not configured' },
        { status: 400 }
      );
    }

    // List files in the vector store
    const vectorStoreFiles = await openai.vectorStores.files.list(storeId, {
      limit,
    });

    // Get detailed information for each file
    const fileDetails = await Promise.all(
      vectorStoreFiles.data.map(async (vsFile) => {
        try {
          const file = await openai.files.retrieve(vsFile.id);
          return {
            id: vsFile.id,
            filename: file.filename || vsFile.id,
            status:
              vsFile.status === 'completed'
                ? 'completed'
                : vsFile.status === 'failed'
                  ? 'failed'
                  : 'processing',
            createdAt: new Date(vsFile.created_at * 1000),
          };
        } catch (_error) {
          // If we can't retrieve the file details, use what we have
          return {
            id: vsFile.id,
            filename: vsFile.id,
            status: vsFile.status,
            createdAt: new Date(vsFile.created_at * 1000),
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      files: fileDetails,
      vectorStoreId: storeId,
    });
  } catch (error) {
    console.error('List files error:', error);
    return NextResponse.json(
      {
        error: 'Failed to list files',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
