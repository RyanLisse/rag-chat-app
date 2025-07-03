import OpenAI from 'openai';

// File upload options
export interface FileUploadOptions {
  file: File | Blob;
  filename: string;
  metadata?: Record<string, any>;
}

// Vector store search options
export interface SearchOptions {
  query: string;
  limit?: number;
  filter?: Record<string, any>;
}

// File processing status
export interface FileStatus {
  id: string;
  filename: string;
  status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Search result
export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  score: number;
  filename?: string;
}

export class VectorStoreClient {
  private openai: OpenAI;
  private vectorStoreId?: string;

  constructor(apiKey: string, vectorStoreId?: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is required');
    }
    // Add dangerouslyAllowBrowser for test environments and browser usage
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
    this.vectorStoreId = vectorStoreId;
  }

  /**
   * Get or create a vector store
   */
  async ensureVectorStore(name?: string): Promise<string> {
    if (this.vectorStoreId) {
      try {
        // Verify the vector store exists
        await this.openai.vectorStores.retrieve(this.vectorStoreId);
        return this.vectorStoreId;
      } catch (error) {
        console.log('Vector store not found, creating new one');
      }
    }

    // Create new vector store
    const vectorStore = await this.openai.vectorStores.create({
      name: name || 'RAG Chat Vector Store',
    });

    this.vectorStoreId = vectorStore.id;
    return vectorStore.id;
  }

  /**
   * Upload a single file to the vector store
   */
  async uploadFile(options: FileUploadOptions): Promise<FileStatus> {
    const startTime = new Date();

    try {
      // Ensure we have a vector store
      const vectorStoreId = await this.ensureVectorStore();

      // Upload file to OpenAI
      const uploadedFile = await this.openai.files.create({
        file: new File([options.file], options.filename, {
          type: options.file.type,
        }),
        purpose: 'assistants',
      });

      // Add file to vector store
      const vectorFile = await this.openai.vectorStores.files.create(
        vectorStoreId,
        {
          file_id: uploadedFile.id,
        }
      );

      return {
        id: uploadedFile.id,
        filename: options.filename,
        status: 'processing',
        createdAt: startTime,
      };
    } catch (error) {
      return {
        id: '',
        filename: options.filename,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Upload failed',
        createdAt: startTime,
      };
    }
  }

  /**
   * Upload multiple files to the vector store
   */
  async uploadFiles(files: FileUploadOptions[]): Promise<{
    batchId: string;
    files: FileStatus[];
  }> {
    const vectorStoreId = await this.ensureVectorStore();
    const uploadResults: FileStatus[] = [];
    const fileIds: string[] = [];

    // Upload all files first
    for (const fileOptions of files) {
      const startTime = new Date();
      try {
        const uploadedFile = await this.openai.files.create({
          file: new File([fileOptions.file], fileOptions.filename, {
            type: fileOptions.file.type,
          }),
          purpose: 'assistants',
        });

        fileIds.push(uploadedFile.id);
        uploadResults.push({
          id: uploadedFile.id,
          filename: fileOptions.filename,
          status: 'uploaded',
          createdAt: startTime,
        });
      } catch (error) {
        uploadResults.push({
          id: '',
          filename: fileOptions.filename,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Upload failed',
          createdAt: startTime,
        });
      }
    }

    // Create batch for all successfully uploaded files
    if (fileIds.length > 0) {
      const batch = await this.openai.vectorStores.fileBatches.create(
        vectorStoreId,
        {
          file_ids: fileIds,
        }
      );

      // Update statuses to processing
      uploadResults.forEach((result) => {
        if (result.status === 'uploaded' && fileIds.includes(result.id)) {
          result.status = 'processing';
        }
      });

      return {
        batchId: batch.id,
        files: uploadResults,
      };
    }

    return {
      batchId: '',
      files: uploadResults,
    };
  }

  /**
   * Check the processing status of a batch
   */
  async checkBatchStatus(batchId: string): Promise<{
    status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
    completedCount: number;
    inProgressCount: number;
    failedCount: number;
  }> {
    const vectorStoreId = await this.ensureVectorStore();
    const batch = await (this.openai.vectorStores.fileBatches.retrieve as any)(
      vectorStoreId,
      batchId
    );

    return {
      status: batch.status,
      completedCount: batch.file_counts.completed,
      inProgressCount: batch.file_counts.in_progress,
      failedCount: batch.file_counts.failed,
    };
  }

  /**
   * Check the processing status of individual files
   */
  async checkFileStatus(fileIds: string[]): Promise<FileStatus[]> {
    const vectorStoreId = await this.ensureVectorStore();

    return Promise.all(
      fileIds.map(async (fileId) => {
        try {
          const file = await (this.openai.vectorStores.files.retrieve as any)(
            vectorStoreId,
            fileId
          );

          return {
            id: fileId,
            filename: fileId, // Note: OpenAI doesn't return filename in vector store file
            status:
              file.status === 'completed'
                ? 'completed'
                : file.status === 'failed'
                  ? 'failed'
                  : 'processing',
            createdAt: new Date(file.created_at * 1000),
          };
        } catch (error) {
          return {
            id: fileId,
            filename: fileId,
            status: 'failed' as const,
            error: 'File not found',
            createdAt: new Date(),
          };
        }
      })
    );
  }

  /**
   * Poll for file processing completion
   */
  async waitForProcessing(
    batchId: string,
    options: {
      maxWaitTime?: number; // in milliseconds
      pollInterval?: number; // in milliseconds
      onProgress?: (status: any) => void;
    } = {}
  ): Promise<boolean> {
    const maxWaitTime = options.maxWaitTime || 5 * 60 * 1000; // 5 minutes default
    const pollInterval = options.pollInterval || 2000; // 2 seconds default
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.checkBatchStatus(batchId);

      if (options.onProgress) {
        options.onProgress(status);
      }

      if (status.status === 'completed') {
        return true;
      }

      if (status.status === 'failed' || status.status === 'cancelled') {
        return false;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error('Processing timeout');
  }

  /**
   * Delete a file from the vector store
   */
  async deleteFile(fileId: string): Promise<void> {
    const vectorStoreId = await this.ensureVectorStore();

    try {
      // Delete from vector store using del method as per OpenAI API docs
      await (this.openai.vectorStores.files as any).del(vectorStoreId, fileId);

      // Delete the file itself using delete method
      await this.openai.files.delete(fileId);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * List all files in the vector store
   */
  async listFiles(limit = 20): Promise<
    Array<{
      id: string;
      createdAt: Date;
      status: string;
    }>
  > {
    const vectorStoreId = await this.ensureVectorStore();
    const files = await this.openai.vectorStores.files.list(vectorStoreId, {
      limit,
    });

    return files.data.map((file) => ({
      id: file.id,
      createdAt: new Date(file.created_at * 1000),
      status: file.status,
    }));
  }

  /**
   * Get the vector store ID
   */
  getVectorStoreId(): string | undefined {
    return this.vectorStoreId;
  }
}
