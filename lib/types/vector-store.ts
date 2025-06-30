import { z } from 'zod';

// Base file upload schemas
export const FileUploadSchema = z.object({
  file: z.instanceof(File),
  filename: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export const FileUploadOptionsSchema = z.object({
  file: z.union([z.instanceof(File), z.instanceof(Blob)]),
  filename: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

// File status schemas
export const FileStatusEnum = z.enum(['uploading', 'uploaded', 'processing', 'completed', 'failed']);

export const FileStatusSchema = z.object({
  id: z.string(),
  filename: z.string(),
  status: FileStatusEnum,
  error: z.string().optional(),
  createdAt: z.date(),
  completedAt: z.date().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Search schemas
export const SearchOptionsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(100).default(10),
  filter: z.record(z.unknown()).optional(),
  vectorStoreId: z.string().optional(),
});

export const SearchResultSchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: z.record(z.unknown()),
  score: z.number().min(0).max(1),
  filename: z.string().optional(),
  fileId: z.string().optional(),
});

// Vector store batch schemas
export const BatchStatusEnum = z.enum(['in_progress', 'completed', 'failed', 'cancelled']);

export const BatchStatusSchema = z.object({
  batchId: z.string(),
  status: BatchStatusEnum,
  completedCount: z.number().min(0),
  inProgressCount: z.number().min(0),
  failedCount: z.number().min(0),
  totalCount: z.number().min(0),
  createdAt: z.date().optional(),
  completedAt: z.date().optional(),
});

// API request/response schemas
export const UploadRequestSchema = z.object({
  files: z.array(FileUploadSchema).min(1).max(20),
  vectorStoreId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UploadResponseSchema = z.object({
  success: z.boolean(),
  files: z.array(FileStatusSchema),
  vectorStoreId: z.string().optional(),
  batchId: z.string().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export const StatusRequestSchema = z.object({
  vectorStoreId: z.string(),
  batchId: z.string().optional(),
  fileIds: z.array(z.string()).optional(),
});

export const StatusResponseSchema = z.object({
  success: z.boolean(),
  status: BatchStatusEnum,
  files: z.array(FileStatusSchema).optional(),
  completedCount: z.number().min(0),
  inProgressCount: z.number().min(0),
  failedCount: z.number().min(0),
  error: z.string().optional(),
});

export const SearchRequestSchema = z.object({
  query: z.string().min(1),
  vectorStoreId: z.string().optional(),
  limit: z.number().min(1).max(100).default(10),
  filter: z.record(z.unknown()).optional(),
});

export const SearchResponseSchema = z.object({
  success: z.boolean(),
  results: z.array(SearchResultSchema),
  query: z.string(),
  totalResults: z.number().min(0),
  processingTime: z.number().min(0),
  error: z.string().optional(),
});

// Citation schemas for file search
export const CitationSchema = z.object({
  text: z.string(),
  fileId: z.string(),
  quote: z.string().optional(),
  startIndex: z.number().optional(),
  endIndex: z.number().optional(),
});

export const FileSearchResponseSchema = z.object({
  success: z.boolean(),
  content: z.string().optional(),
  citations: z.array(CitationSchema).optional(),
  threadId: z.string().optional(),
  error: z.string().optional(),
});

// Error handling schemas
export const VectorStoreErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  retryable: z.boolean().default(false),
});

// Configuration schemas
export const VectorStoreConfigSchema = z.object({
  apiKey: z.string().min(1),
  vectorStoreId: z.string().optional(),
  maxFileSize: z.number().positive().default(512 * 1024 * 1024), // 512MB
  maxFiles: z.number().positive().default(20),
  supportedTypes: z.array(z.string()).default([
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/pdf',
    'application/json',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
  retryConfig: z.object({
    maxRetries: z.number().min(0).default(3),
    retryDelay: z.number().min(0).default(1000),
    backoffMultiplier: z.number().min(1).default(2),
  }).default({}),
});

// Export inferred types
export type FileUpload = z.infer<typeof FileUploadSchema>;
export type FileUploadOptions = z.infer<typeof FileUploadOptionsSchema>;
export type FileStatus = z.infer<typeof FileStatusSchema>;
export type FileStatusType = z.infer<typeof FileStatusEnum>;
export type SearchOptions = z.infer<typeof SearchOptionsSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type BatchStatus = z.infer<typeof BatchStatusSchema>;
export type BatchStatusType = z.infer<typeof BatchStatusEnum>;

// API types
export type UploadRequest = z.infer<typeof UploadRequestSchema>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
export type StatusRequest = z.infer<typeof StatusRequestSchema>;
export type StatusResponse = z.infer<typeof StatusResponseSchema>;
export type SearchRequest = z.infer<typeof SearchRequestSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type Citation = z.infer<typeof CitationSchema>;
export type FileSearchResponse = z.infer<typeof FileSearchResponseSchema>;

// Error types
export type VectorStoreError = z.infer<typeof VectorStoreErrorSchema>;

// Configuration types
export type VectorStoreConfig = z.infer<typeof VectorStoreConfigSchema>;

// Utility type for async operations
export type AsyncOperationResult<T> = {
  success: boolean;
  data?: T;
  error?: VectorStoreError;
};

// Progress callback type for long-running operations
export type ProgressCallback = (progress: {
  completed: number;
  total: number;
  status: string;
  message?: string;
}) => void;

// Retry configuration type
export type RetryConfig = {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
};

// OpenAI API response types for vector store operations
export interface OpenAIVectorStoreFile {
  id: string;
  object: 'vector_store.file';
  created_at: number;
  vector_store_id: string;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  last_error?: {
    code: string;
    message: string;
  };
}

export interface OpenAIFileBatch {
  id: string;
  object: 'vector_store.files_batch';
  created_at: number;
  vector_store_id: string;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  file_counts: {
    in_progress: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
  };
}

export interface OpenAIVectorStore {
  id: string;
  object: 'vector_store';
  created_at: number;
  name: string;
  description?: string;
  status: 'expired' | 'in_progress' | 'completed';
  file_counts: {
    in_progress: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
  };
  metadata: Record<string, any>;
}

// Constants
export const SUPPORTED_FILE_TYPES = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/pdf',
  'application/json',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const MAX_FILE_SIZE = 512 * 1024 * 1024; // 512MB
export const MAX_FILES_PER_BATCH = 20;
export const DEFAULT_SEARCH_LIMIT = 10;
export const MAX_SEARCH_LIMIT = 100;
export const DEFAULT_POLL_INTERVAL = 2000; // 2 seconds
export const DEFAULT_MAX_WAIT_TIME = 5 * 60 * 1000; // 5 minutes