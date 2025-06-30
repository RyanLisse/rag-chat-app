'use client';

import * as React from 'react';
import { useDropzone, type DropzoneOptions } from 'react-dropzone-esm';
import { cn } from '@/lib/utils';
import { 
  Upload, 
  X, 
  FileText, 
  FileCheck2, 
  AlertCircle, 
  FileSpreadsheet,
  FileJson,
  FileCode,
  File,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

interface DropzoneProps extends Omit<DropzoneOptions, 'onDrop'> {
  className?: string;
  onFilesAdded?: (files: File[]) => void;
  fileProgress?: FileUploadProgress[];
  onRemoveFile?: (file: File) => void;
}

export function Dropzone({
  className,
  onFilesAdded,
  fileProgress = [],
  onRemoveFile,
  accept = {
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
    'text/csv': ['.csv'],
    'application/pdf': ['.pdf'],
    'application/json': ['.json'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  },
  maxSize = 512 * 1024 * 1024, // 512MB
  multiple = true,
  ...dropzoneOptions
}: DropzoneProps) {
  const [files, setFiles] = React.useState<File[]>([]);

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      setFiles(acceptedFiles);
      onFilesAdded?.(acceptedFiles);
    },
    [onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple,
    ...dropzoneOptions,
  });

  const removeFile = (file: File) => {
    setFiles((prev) => prev.filter((f) => f !== file));
    onRemoveFile?.(file);
  };

  const getFileIcon = (file: File, status?: FileUploadProgress['status']) => {
    if (status === 'uploading' || status === 'processing') {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (status === 'completed') {
      return <FileCheck2 className="h-4 w-4 text-green-500" />;
    }
    if (status === 'failed') {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }

    // File type icons based on extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'txt':
      case 'md':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'csv':
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
      case 'json':
        return <FileJson className="h-4 w-4 text-orange-500" />;
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileCode className="h-4 w-4 text-blue-600" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const getFileProgress = (file: File) => {
    return fileProgress.find((fp) => fp.file === file);
  };

  const getStatusBadge = (status?: FileUploadProgress['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-xs">Pending</Badge>;
      case 'uploading':
        return <Badge variant="secondary" className="text-xs">Uploading</Badge>;
      case 'processing':
        return <Badge variant="default" className="text-xs">Processing</Badge>;
      case 'completed':
        return <Badge variant="default" className="text-xs bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Failed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className={cn('w-full space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary',
          isDragActive && 'border-primary bg-primary/5',
          isDragReject && 'border-red-500 bg-red-50/10',
          'border-gray-300 dark:border-gray-700'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {isDragActive
            ? isDragReject
              ? 'Some files will be rejected'
              : 'Drop files here...'
            : 'Drag and drop files here, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
          Supports: TXT, MD, CSV, PDF, JSON, Excel, Word (max {maxSize / 1024 / 1024}MB)
        </p>
        <Button variant="secondary" size="sm" className="mt-4">
          Select Files
        </Button>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => {
            const progress = getFileProgress(file);
            const isUploading = progress?.status === 'uploading' || progress?.status === 'processing';
            
            return (
              <div
                key={file.name}
                className="flex items-center gap-3 rounded-lg border p-3 dark:border-gray-800 transition-all hover:shadow-sm"
              >
                {getFileIcon(file, progress?.status)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    {getStatusBadge(progress?.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)}MB
                  </p>
                  {progress?.error && (
                    <p className="mt-1 text-xs text-red-500">{progress.error}</p>
                  )}
                  {isUploading && progress.progress > 0 && (
                    <div className="mt-2">
                      <Progress value={progress.progress} className="h-1" />
                      <p className="mt-1 text-xs text-muted-foreground">{Math.round(progress.progress)}%</p>
                    </div>
                  )}
                </div>
                {!isUploading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(file)}
                    className="ml-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}