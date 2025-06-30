'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Citation, CitationSource } from '@/lib/types/citation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarIcon,
  ClockIcon,
  CopyIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  FileIcon,
  FileTextIcon,
  LinkIcon,
  ServerIcon,
  UserIcon,
  XIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface SourcePreviewModalProps {
  source: CitationSource;
  citations: Citation[];
  onClose: () => void;
}

export function SourcePreviewModal({
  source,
  citations,
  onClose,
}: SourcePreviewModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const getSourceIcon = (type: CitationSource['type']) => {
    switch (type) {
      case 'document':
        return <FileTextIcon className="w-5 h-5" />;
      case 'webpage':
        return <LinkIcon className="w-5 h-5" />;
      case 'api':
        return <ServerIcon className="w-5 h-5" />;
      case 'database':
        return <DatabaseIcon className="w-5 h-5" />;
      case 'file':
        return <FileIcon className="w-5 h-5" />;
      default:
        return <FileTextIcon className="w-5 h-5" />;
    }
  };

  const handleCopyUrl = () => {
    if (source.url) {
      navigator.clipboard.writeText(source.url);
      toast.success('URL copied to clipboard');
    }
  };

  const handleOpenExternal = () => {
    if (source.url) {
      window.open(source.url, '_blank', 'noopener,noreferrer');
    }
  };

  const avgRelevanceScore =
    citations.reduce((sum, c) => sum + (c.relevanceScore || 0.5), 0) /
    citations.length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                {getSourceIcon(source.type)}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-1">{source.title}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {source.type}
                  </Badge>
                  <Badge variant="outline">
                    {citations.length} citation
                    {citations.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline">
                    {(avgRelevanceScore * 100).toFixed(0)}% relevance
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <XIcon className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-6 space-y-6">
              {/* Metadata Section */}
              {source.metadata && Object.keys(source.metadata).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    SOURCE INFORMATION
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {source.metadata.author && (
                      <div className="flex items-center gap-2 text-sm">
                        <UserIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-300">
                          {source.metadata.author}
                        </span>
                      </div>
                    )}
                    {source.metadata.date && (
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-300">
                          {new Date(source.metadata.date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {source.metadata.lastModified && (
                      <div className="flex items-center gap-2 text-sm">
                        <ClockIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-300">
                          Updated{' '}
                          {new Date(
                            source.metadata.lastModified
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* URL Section */}
              {source.url && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                      SOURCE URL
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-sm text-gray-600 dark:text-gray-300 break-all">
                        {source.url}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyUrl}
                        title="Copy URL"
                      >
                        <CopyIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleOpenExternal}
                        title="Open in new tab"
                      >
                        <ExternalLinkIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Excerpt Section */}
              {source.metadata?.excerpt && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                      EXCERPT
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {source.metadata.excerpt}
                    </p>
                  </div>
                </>
              )}

              {/* Citations Section */}
              <Separator />
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  CITATIONS FROM THIS SOURCE
                </h3>
                <div className="space-y-3">
                  {citations.map((citation, index) => (
                    <div
                      key={citation.id}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          Citation #{index + 1}
                        </Badge>
                        {citation.relevanceScore && (
                          <span className="text-xs text-gray-500">
                            {(citation.relevanceScore * 100).toFixed(0)}%
                            relevant
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-200 italic">
                        "{citation.text}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Metadata */}
              {source.metadata &&
                Object.entries(source.metadata).filter(
                  ([key]) =>
                    !['author', 'date', 'lastModified', 'excerpt'].includes(key)
                ).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        ADDITIONAL INFORMATION
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(source.metadata)
                          .filter(
                            ([key]) =>
                              ![
                                'author',
                                'date',
                                'lastModified',
                                'excerpt',
                              ].includes(key)
                          )
                          .map(([key, value]) => (
                            <div
                              key={key}
                              className="flex items-start gap-2 text-sm"
                            >
                              <span className="font-medium capitalize text-gray-600 dark:text-gray-400">
                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                              </span>
                              <span className="text-gray-600 dark:text-gray-300">
                                {typeof value === 'string'
                                  ? value
                                  : JSON.stringify(value)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-white dark:bg-gray-900 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Source verified and tracked for accuracy
              </p>
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
