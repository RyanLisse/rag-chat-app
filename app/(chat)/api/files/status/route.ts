import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Request schema
const StatusRequestSchema = z.object({
  vectorStoreId: z.string(),
  batchId: z.string().optional(),
  fileIds: z.array(z.string()).optional(),
});

// Response schema
const StatusResponseSchema = z.object({
  success: z.boolean(),
  status: z.enum(['in_progress', 'completed', 'failed', 'cancelled']),
  files: z
    .array(
      z.object({
        id: z.string(),
        status: z.enum(['in_progress', 'completed', 'failed', 'cancelled']),
        error: z.string().optional(),
      })
    )
    .optional(),
  completedCount: z.number(),
  inProgressCount: z.number(),
  failedCount: z.number(),
});

export type StatusResponse = z.infer<typeof StatusResponseSchema>;

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = StatusRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }

    const { vectorStoreId, batchId, fileIds } = validation.data;

    // If batchId is provided, check batch status
    if (batchId) {
      try {
        type FileBatchesAPI = {
          retrieve: (
            vectorStoreId: string,
            batchId: string
          ) => Promise<{
            status?: string;
            file_counts?: {
              completed?: number;
              in_progress?: number;
              failed?: number;
            };
          }>;
        };
        const fileBatchesApi = openai.vectorStores
          .fileBatches as unknown as FileBatchesAPI;
        const batch = await fileBatchesApi.retrieve(vectorStoreId, batchId);

        const response: StatusResponse = {
          success: true,
          status:
            (batch?.status as
              | 'in_progress'
              | 'completed'
              | 'failed'
              | 'cancelled') || 'in_progress',
          completedCount: batch?.file_counts?.completed || 0,
          inProgressCount: batch?.file_counts?.in_progress || 0,
          failedCount: batch?.file_counts?.failed || 0,
        };

        return NextResponse.json(response);
      } catch (error) {
        console.error('Failed to retrieve batch status:', error);
        return NextResponse.json(
          { error: 'Failed to retrieve batch status' },
          { status: 500 }
        );
      }
    }

    // If fileIds are provided, check individual file status
    if (fileIds && fileIds.length > 0) {
      try {
        const fileStatuses = await Promise.all(
          fileIds.map(async (fileId) => {
            try {
              type FilesAPI = {
                retrieve: (
                  vectorStoreId: string,
                  fileId: string
                ) => Promise<{ status?: string }>;
              };
              const filesApi = openai.vectorStores.files as unknown as FilesAPI;
              const file = await filesApi.retrieve(vectorStoreId, fileId);
              return {
                id: fileId,
                status:
                  (file.status as
                    | 'in_progress'
                    | 'completed'
                    | 'failed'
                    | 'cancelled') ?? 'failed',
              };
            } catch (_error) {
              return {
                id: fileId,
                status: 'failed' as const,
                error: 'File not found or retrieval failed',
              };
            }
          })
        );

        const completedCount = fileStatuses.filter(
          (f) => f.status === 'completed'
        ).length;
        const inProgressCount = fileStatuses.filter(
          (f) => f.status === 'in_progress'
        ).length;
        const failedCount = fileStatuses.filter(
          (f) => f.status === 'failed'
        ).length;

        const overallStatus =
          inProgressCount > 0
            ? 'in_progress'
            : failedCount === fileStatuses.length
              ? 'failed'
              : completedCount === fileStatuses.length
                ? 'completed'
                : 'in_progress';

        const response: StatusResponse = {
          success: true,
          status: overallStatus,
          files: fileStatuses,
          completedCount,
          inProgressCount,
          failedCount,
        };

        return NextResponse.json(response);
      } catch (error) {
        console.error('Failed to retrieve file statuses:', error);
        return NextResponse.json(
          { error: 'Failed to retrieve file statuses' },
          { status: 500 }
        );
      }
    }

    // If neither batchId nor fileIds provided, return error
    return NextResponse.json(
      { error: 'Either batchId or fileIds must be provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
