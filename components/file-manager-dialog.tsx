'use client';

import { FileUploadDropzone } from '@/components/file-upload-dropzone';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { VectorStoreClient } from '@/lib/ai/vector-store';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface FileInfo {
  id: string;
  filename: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  error?: string;
}

interface FileManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vectorStoreId?: string;
}

export function FileManagerDialog({
  open,
  onOpenChange,
  vectorStoreId,
}: FileManagerDialogProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  // Load existing files when dialog opens
  useEffect(() => {
    if (open) {
      loadFiles();
    }
  }, [open]);

  const loadFiles = async () => {
    if (!vectorStoreId) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/files/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vectorStoreId }),
      });

      if (!response.ok) {
        throw new Error('Failed to load files');
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error loading files:', error);
      toast.error('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = useCallback(
    (uploadedFiles: any[]) => {
      // Refresh the file list after upload
      loadFiles();
      toast.success(
        `Successfully uploaded ${uploadedFiles.filter((f) => f.status === 'completed').length} files`
      );
    },
    [vectorStoreId]
  );

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    setDeletingFileId(fileId);
    try {
      const response = await fetch('/api/files/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, vectorStoreId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    } finally {
      setDeletingFileId(null);
    }
  };

  const getStatusIcon = (status: FileInfo['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: FileInfo['status']) => {
    switch (status) {
      case 'uploading':
        return <Badge variant="secondary">Uploading</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'completed':
        return <Badge variant="default">Ready</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Knowledge Base Manager
          </DialogTitle>
          <DialogDescription>
            Upload and manage documents for the AI to reference during
            conversations. Supported formats: TXT, MD, CSV, PDF, JSON, Excel,
            Word.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Section */}
          <div>
            <h3 className="text-sm font-medium mb-3">Upload New Documents</h3>
            <FileUploadDropzone
              onUploadComplete={handleUploadComplete}
              onError={(error) => toast.error(error)}
            />
          </div>

          <Separator />

          {/* Existing Files Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Uploaded Documents</h3>
              {files.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {files.length} document{files.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No documents uploaded yet</p>
                <p className="text-xs mt-1">
                  Upload documents to enhance AI responses with your knowledge
                  base
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {getStatusIcon(file.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {file.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Added{' '}
                            {new Date(file.createdAt).toLocaleDateString()}
                          </p>
                          {file.error && (
                            <p className="text-xs text-red-500 mt-1">
                              {file.error}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(file.status)}
                      </div>
                      {file.status === 'completed' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(file.id)}
                          disabled={deletingFileId === file.id}
                        >
                          {deletingFileId === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
