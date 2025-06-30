'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FileUploadStatus {
  id: string;
  filename: string;
  status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
}

interface FileUploadProps {
  onUploadComplete?: (files: FileUploadStatus[]) => void;
  onError?: (error: string) => void;
  accept?: string;
  multiple?: boolean;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
}

export function FileUpload({
  onUploadComplete,
  onError,
  accept = '.txt,.md,.csv,.pdf,.json,.xlsx,.xls,.doc,.docx',
  multiple = true,
  maxFileSize = 512 * 1024 * 1024, // 512MB
  maxFiles = 10,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileUploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles = Array.from(fileList);

    // Validate file count
    if (newFiles.length > maxFiles) {
      onError?.(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate file sizes
    const oversizedFiles = newFiles.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      onError?.(`Files exceed maximum size of ${maxFileSize / 1024 / 1024}MB: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    // Initialize file statuses
    const fileStatuses: FileUploadStatus[] = newFiles.map(file => ({
      id: `${Date.now()}-${file.name}`,
      filename: file.name,
      status: 'uploading',
      progress: 0,
    }));

    setFiles(fileStatuses);
    setIsUploading(true);

    try {
      // Create FormData
      const formData = new FormData();
      newFiles.forEach(file => {
        formData.append('files', file);
      });

      // Upload files
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Update file statuses with server response
      const updatedFiles = data.files.map((file: any) => ({
        id: file.id,
        filename: file.filename,
        status: file.status,
        error: file.error,
      }));

      setFiles(updatedFiles);

      // Start polling for processing status if we have a batch ID
      if (data.batchId && data.vectorStoreId) {
        startPolling(data.vectorStoreId, data.batchId, updatedFiles);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onError?.(errorMessage);
      
      // Update all files to failed status
      setFiles(prev => prev.map(file => ({
        ...file,
        status: 'failed',
        error: errorMessage,
      })));
      setIsUploading(false);
    }
  }, [maxFiles, maxFileSize, onError]);

  const startPolling = useCallback((vectorStoreId: string, batchId: string, initialFiles: FileUploadStatus[]) => {
    let pollCount = 0;
    const maxPolls = 150; // 5 minutes with 2-second intervals

    const poll = async () => {
      try {
        const response = await fetch('/api/files/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vectorStoreId,
            batchId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Status check failed');
        }

        // Update progress
        const totalFiles = initialFiles.length;
        const progress = ((data.completedCount + data.failedCount) / totalFiles) * 100;

        setFiles(prev => prev.map(file => ({
          ...file,
          progress,
          status: data.status === 'completed' ? 'completed' :
                 data.status === 'failed' ? 'failed' :
                 'processing',
        })));

        // Check if processing is complete
        if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(pollIntervalRef.current);
          setIsUploading(false);
          
          const finalFiles = files.map(file => ({
            ...file,
            status: data.status as any,
          }));
          
          onUploadComplete?.(finalFiles);
        } else if (pollCount >= maxPolls) {
          clearInterval(pollIntervalRef.current);
          setIsUploading(false);
          onError?.('Processing timeout');
        }

        pollCount++;
      } catch (error) {
        clearInterval(pollIntervalRef.current);
        setIsUploading(false);
        onError?.(error instanceof Error ? error.message : 'Status check failed');
      }
    };

    // Start polling
    poll(); // Initial poll
    pollIntervalRef.current = setInterval(poll, 2000);
  }, [files, onUploadComplete, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  const getStatusIcon = (status: FileUploadStatus['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-full space-y-4">
      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-gray-300 dark:border-gray-700",
          isUploading && "pointer-events-none opacity-50"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={isUploading}
        />

        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Supports: TXT, MD, CSV, PDF, JSON, Excel, Word (max {maxFileSize / 1024 / 1024}MB)
        </p>
        
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          Select Files
        </Button>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 rounded-lg border p-3 dark:border-gray-800"
            >
              {getStatusIcon(file.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.filename}</p>
                {file.error && (
                  <p className="text-xs text-red-500 mt-1">{file.error}</p>
                )}
                {file.status === 'processing' && file.progress !== undefined && (
                  <Progress value={file.progress} className="mt-2 h-1" />
                )}
              </div>
              {!isUploading && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(file.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}