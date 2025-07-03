import { NextResponse } from 'next/server';
import OpenAI from 'openai';

import { auth } from '@/app/(auth)/auth';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(_request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get or create vector store
    let vectorStoreId = process.env.OPENAI_VECTORSTORE_ID;
    let vectorStore;

    try {
      if (vectorStoreId) {
        // Try to retrieve existing vector store
        vectorStore = await openai.vectorStores.retrieve(vectorStoreId);
      }
    } catch (_error) {
      vectorStoreId = undefined;
    }

    if (!vectorStore) {
      // Create new vector store
      vectorStore = await openai.vectorStores.create({
        name: 'RAG Chat Vector Store',
      });
      vectorStoreId = vectorStore.id;
    }

    return NextResponse.json({
      success: true,
      vectorStoreId,
      status: vectorStore.status,
      fileCount: vectorStore.file_counts || { total: 0 },
      message: 'Vector store initialized successfully',
    });
  } catch (error) {
    console.error('Vector store initialization error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize vector store',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
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
        success: false,
        message: 'No vector store configured',
      });
    }

    // Retrieve vector store info
    const vectorStore = await openai.vectorStores.retrieve(vectorStoreId);

    return NextResponse.json({
      success: true,
      vectorStoreId,
      status: vectorStore.status,
      fileCount: vectorStore.file_counts || { total: 0 },
      message: 'Vector store status retrieved',
    });
  } catch (error) {
    console.error('Vector store status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get vector store status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
