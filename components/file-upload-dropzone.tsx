'use client';

import { useState, useCallback, useRef } from 'react';
import { Dropzone, type FileUploadProgress } from '@/components/ui/dropzone';
import { toast } from 'sonner';

interface FileUploadDropzoneProps {
  onUploadComplete?: (files: any[]) => void;
  onError?: (error: string) => void;
  maxFileSize?: number;
  maxFiles?: number;
}

export function FileUploadDropzone({
  onUploadComplete,
  onError,
  maxFileSize = 512 * 1024 * 1024, // 512MB
  maxFiles = 10,
}: FileUploadDropzoneProps) {
  const [fileProgress, setFileProgress] = useState<FileUploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  const updateFileProgress = (file: File, updates: Partial<FileUploadProgress>) => {
    setFileProgress((prev) => {
      const existing = prev.find((fp) => fp.file === file);
      if (existing) {
        return prev.map((fp) => (fp.file === file ? { ...fp, ...updates } : fp));
      }
      return [...prev, { file, progress: 0, status: 'pending', ...updates } as FileUploadProgress];
    });
  };

  const handleFilesAdded = useCallback(
    async (files: File[]) => {
      if (files.length > maxFiles) {
        onError?.(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const oversizedFiles = files.filter((file) => file.size > maxFileSize);
      if (oversizedFiles.length > 0) {
        onError?.(
          `Files exceed maximum size of ${maxFileSize / 1024 / 1024}MB: ${oversizedFiles.map((f) => f.name).join(', ')}`
        );
        return;
      }

      setIsUploading(true);

      // Initialize progress for all files
      files.forEach((file) => {
        updateFileProgress(file, { status: 'uploading', progress: 0 });
      });

      try {
        const formData = new FormData();
        files.forEach((file) => {
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
        files.forEach((file, index) => {
          const serverFile = data.files?.[index];
          if (serverFile) {
            updateFileProgress(file, {
              status: serverFile.status,
              error: serverFile.error,
              progress: serverFile.status === 'uploaded' ? 50 : 0,
            });
          }
        });

        // Start polling for processing status if we have a batch ID
        if (data.batchId && data.vectorStoreId) {
          startPolling(data.vectorStoreId, data.batchId, files);
        } else {
          setIsUploading(false);
          onUploadComplete?.(data.files);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        onError?.(errorMessage);

        // Update all files to failed status
        files.forEach((file) => {
          updateFileProgress(file, { status: 'failed', error: errorMessage });
        });
        setIsUploading(false);
      }
    },
    [maxFiles, maxFileSize, onError, onUploadComplete]
  );

  const startPolling = useCallback(
    (vectorStoreId: string, batchId: string, files: File[]) => {
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

          // Update progress for all files
          const progress = ((data.completedCount + data.failedCount) / files.length) * 100;
          
          files.forEach((file) => {
            updateFileProgress(file, {
              progress: Math.min(50 + progress / 2, 100), // 50-100% for processing
              status: data.status === 'completed' 
                ? 'completed' 
                : data.status === 'failed' 
                  ? 'failed' 
                  : 'processing',
            });
          });

          // Check if processing is complete
          if (
            data.status === 'completed' ||
            data.status === 'failed' ||
            data.status === 'cancelled' ||
            pollCount >= maxPolls
          ) {
            clearInterval(pollIntervalRef.current);
            setIsUploading(false);

            if (data.status === 'completed') {
              toast.success(`Successfully processed ${files.length} files`);
            } else if (pollCount >= maxPolls) {
              onError?.('Processing timeout');
            }

            onUploadComplete?.(
              files.map((file) => ({
                filename: file.name,
                status: data.status,
              }))
            );
          }

          pollCount++;
        } catch (error) {
          clearInterval(pollIntervalRef.current);
          setIsUploading(false);
          onError?.(error instanceof Error ? error.message : 'Status check failed');
        }
      };

      // Start polling
      poll();
      pollIntervalRef.current = setInterval(poll, 2000);
    },
    [onUploadComplete, onError]
  );

  const handleRemoveFile = useCallback((file: File) => {
    setFileProgress((prev) => prev.filter((fp) => fp.file !== file));
  }, []);

  return (
    <Dropzone
      onFilesAdded={handleFilesAdded}
      fileProgress={fileProgress}
      onRemoveFile={handleRemoveFile}
      disabled={isUploading}
      maxFiles={maxFiles}
      maxSize={maxFileSize}
    />
  );
}