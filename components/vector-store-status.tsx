'use client';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  HardDrive,
  Search,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface VectorStoreStats {
  totalDocuments: number;
  totalSize: number;
  lastUpdated: Date;
  status: 'connected' | 'disconnected' | 'error';
  processingFiles: number;
  completedFiles: number;
  failedFiles: number;
  recentSearches: Array<{
    query: string;
    timestamp: Date;
    resultCount: number;
  }>;
  recentUploads: Array<{
    filename: string;
    timestamp: Date;
    status: 'completed' | 'processing' | 'failed';
    size: number;
  }>;
}

export function VectorStoreStatus() {
  const [stats, setStats] = useState<VectorStoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch vector store stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/vector-store/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch vector store stats');
      }
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Set disconnected status on error
      setStats((prev) => (prev ? { ...prev, status: 'error' } : null));
    } finally {
      setLoading(false);
    }
  };

  // Set up polling for real-time updates
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !stats) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Vector Store Error
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>Knowledge Base Status</CardTitle>
          </div>
          <Badge
            variant={
              stats?.status === 'connected'
                ? 'default'
                : stats?.status === 'error'
                  ? 'destructive'
                  : 'secondary'
            }
          >
            {stats?.status === 'connected' && (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            )}
            {stats?.status === 'error' && (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            {stats?.status || 'Unknown'}
          </Badge>
        </div>
        <CardDescription>
          Real-time vector store statistics and document availability
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Total Documents
              </span>
              <span className="text-2xl font-bold">
                {stats?.totalDocuments || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                Storage Used
              </span>
              <span className="text-sm font-medium">
                {formatBytes(stats?.totalSize || 0)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Processing
              </span>
              <span className="text-2xl font-bold">
                {stats?.processingFiles || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last Updated
              </span>
              <span className="text-sm font-medium">
                {stats?.lastUpdated
                  ? formatDistanceToNow(new Date(stats.lastUpdated), {
                      addSuffix: true,
                    })
                  : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {/* Processing Progress */}
        {stats &&
          (stats.processingFiles > 0 ||
            stats.completedFiles > 0 ||
            stats.failedFiles > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Processing Progress
                </span>
                <span className="font-medium">
                  {stats.completedFiles} /{' '}
                  {stats.completedFiles +
                    stats.processingFiles +
                    stats.failedFiles}
                </span>
              </div>
              <Progress
                value={
                  (stats.completedFiles /
                    (stats.completedFiles +
                      stats.processingFiles +
                      stats.failedFiles)) *
                  100
                }
                className="h-2"
              />
              {stats.failedFiles > 0 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {stats.failedFiles} files failed to process
                </p>
              )}
            </div>
          )}

        {/* Recent Uploads */}
        {stats?.recentUploads && stats.recentUploads.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <Upload className="h-3 w-3" />
              Recent Uploads
            </h4>
            <ScrollArea className="h-24">
              <div className="space-y-1">
                {stats.recentUploads.map((upload, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm py-1"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge
                        variant={
                          upload.status === 'completed'
                            ? 'default'
                            : upload.status === 'processing'
                              ? 'secondary'
                              : 'destructive'
                        }
                        className="h-5 px-1 text-xs"
                      >
                        {upload.status === 'completed' && (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {upload.status === 'processing' && (
                          <Clock className="h-3 w-3" />
                        )}
                        {upload.status === 'failed' && (
                          <AlertCircle className="h-3 w-3" />
                        )}
                      </Badge>
                      <span className="truncate">{upload.filename}</span>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatDistanceToNow(new Date(upload.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Recent Searches */}
        {stats?.recentSearches && stats.recentSearches.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <Search className="h-3 w-3" />
              Recent Searches
            </h4>
            <ScrollArea className="h-20">
              <div className="space-y-1">
                {stats.recentSearches.map((search, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm py-1"
                  >
                    <span className="truncate flex-1">{search.query}</span>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge variant="outline" className="h-5 px-1 text-xs">
                        {search.resultCount} results
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(search.timestamp), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty State */}
        {stats && stats.totalDocuments === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No documents in the knowledge base yet.</p>
            <p className="text-xs mt-1">
              Upload documents to enable RAG search functionality.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}
