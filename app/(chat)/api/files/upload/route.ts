import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Supported file types for vector store
const SUPPORTED_FILE_TYPES = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/pdf',
  'application/json',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Maximum file size: 512MB (OpenAI limit)
const MAX_FILE_SIZE = 512 * 1024 * 1024;

// File validation schema
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: `File size should be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    })
    .refine((file) => SUPPORTED_FILE_TYPES.includes(file.type), {
      message: `File type should be one of: ${SUPPORTED_FILE_TYPES.join(', ')}`,
    }),
});

// Response schema
const UploadResponseSchema = z.object({
  success: z.boolean(),
  files: z.array(
    z.object({
      id: z.string(),
      filename: z.string(),
      status: z.enum(['uploaded', 'processing', 'completed', 'failed']),
      error: z.string().optional(),
    })
  ),
  vectorStoreId: z.string().optional(),
  message: z.string().optional(),
});

export type UploadResponse = z.infer<typeof UploadResponseSchema>;

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    // Validate all files
    const validationErrors: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const validation = FileSchema.safeParse({ file: files[i] });
      if (!validation.success) {
        validationErrors.push(
          `File ${i + 1} (${files[i].name}): ${validation.error.errors
            .map((error) => error.message)
            .join(', ')}`
        );
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join('; ') },
        { status: 400 }
      );
    }

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
      vectorStoreId = vectorStore?.id;

      if (!vectorStoreId) {
        return NextResponse.json(
          {
            error: 'Failed to create vector store',
            details: 'Vector store creation returned no ID',
          },
          { status: 500 }
        );
      }
    }

    // Upload files to OpenAI
    const uploadResults: Array<{
      id: string;
      filename: string;
      status: 'uploaded' | 'processing' | 'completed' | 'failed';
      error?: string;
    }> = [];
    const fileIds: string[] = [];

    for (const file of files) {
      try {
        // Convert file to proper format for OpenAI
        const buffer = await file.arrayBuffer();
        const fileBlob = new Blob([buffer], { type: file.type });

        // Create a File object with proper name
        const openaiFile = new File([fileBlob], file.name, { type: file.type });

        // Upload to OpenAI Files API
        const uploadedFile = await openai.files.create({
          file: openaiFile,
          purpose: 'assistants',
        });

        fileIds.push(uploadedFile.id);
        uploadResults.push({
          id: uploadedFile.id,
          filename: file.name,
          status: 'uploaded' as const,
        });
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error);
        uploadResults.push({
          id: '',
          filename: file.name,
          status: 'failed' as const,
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }

    // Add successfully uploaded files to vector store
    if (fileIds.length > 0) {
      try {
        const batch = await openai.vectorStores.fileBatches.create(
          vectorStoreId!,
          {
            file_ids: fileIds,
          }
        );

        // Update status to processing
        uploadResults.forEach((result) => {
          if (result.status === 'uploaded' && fileIds.includes(result.id)) {
            result.status = 'processing';
          }
        });

        // Return response with batch ID for polling
        return NextResponse.json({
          success: true,
          files: uploadResults,
          vectorStoreId,
          batchId: batch.id,
          message: `Successfully uploaded ${fileIds.length} file(s). Processing in vector store...`,
        });
      } catch (error) {
        console.error('Failed to add files to vector store:', error);
        return NextResponse.json(
          {
            success: false,
            files: uploadResults,
            vectorStoreId,
            message: 'Files uploaded but failed to add to vector store',
            error:
              error instanceof Error ? error.message : 'Vector store error',
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: false,
      files: uploadResults,
      message: 'No files were successfully uploaded',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
