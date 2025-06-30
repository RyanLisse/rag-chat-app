'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type {
  CitationArtifactMetadata,
  CitationSource,
} from '@/lib/types/citation';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart2Icon,
  CalendarIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  FileTextIcon,
  LinkIcon,
  UserIcon,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { CitationStatisticsPanel } from './citation-statistics-panel';
import { SourcePreviewModal } from './source-preview-modal';

interface CitationContentProps {
  title: string;
  content: string;
  metadata: CitationArtifactMetadata;
  setMetadata: Dispatch<SetStateAction<CitationArtifactMetadata>>;
  isCurrentVersion: boolean;
  status: 'streaming' | 'idle';
  onSaveContent: (content: string, debounce: boolean) => void;
}

export function CitationContent({
  title,
  content,
  metadata,
  setMetadata,
  isCurrentVersion,
  status,
  onSaveContent,
}: CitationContentProps) {
  const [selectedSource, setSelectedSource] = useState<CitationSource | null>(
    null
  );
  const [highlightedCitations, setHighlightedCitations] = useState<Set<string>>(
    new Set()
  );
  const [showStatistics, setShowStatistics] = useState(false);

  const handleCitationClick = useCallback(
    (citationId: string) => {
      const citation = metadata.citations.find((c) => c.id === citationId);
      if (citation) {
        const source = metadata.sources.find(
          (s) => s.id === citation.source.id
        );
        if (source) {
          setSelectedSource(source);
        }
        setMetadata((prev) => ({ ...prev, selectedCitationId: citationId }));
      }
    },
    [metadata.citations, metadata.sources, setMetadata]
  );

  const handleCitationHover = useCallback(
    (citationId: string, isHovering: boolean) => {
      setHighlightedCitations((prev) => {
        const newSet = new Set(prev);
        if (isHovering) {
          newSet.add(citationId);
        } else {
          newSet.delete(citationId);
        }
        return newSet;
      });
    },
    []
  );

  const processedContent = useMemo(() => {
    if (!metadata.citations.length) return content;

    let result = content;
    const citationElements: JSX.Element[] = [];

    metadata.citations.forEach((citation, index) => {
      const citationNumber = index + 1;
      const regex = new RegExp(`\\[${citationNumber}\\]`, 'g');

      result = result.replace(
        regex,
        `<citation-ref id="${citation.id}" number="${citationNumber}"></citation-ref>`
      );
    });

    return result;
  }, [content, metadata.citations]);

  const renderContentWithCitations = useCallback(() => {
    const parts = processedContent.split(
      /(<citation-ref[^>]*><\/citation-ref>)/
    );

    return parts.map((part, index) => {
      const match = part.match(
        /<citation-ref id="([^"]*)" number="([^"]*)"><\/citation-ref>/
      );

      if (match) {
        const [, citationId, citationNumber] = match;
        const isHighlighted = highlightedCitations.has(citationId);
        const isSelected = metadata.selectedCitationId === citationId;
        const citation = metadata.citations.find((c) => c.id === citationId);
        const source = citation
          ? metadata.sources.find((s) => s.id === citation.source.id)
          : null;

        return (
          <sup
            key={`citation-${index}`}
            className={cn(
              'inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full cursor-pointer transition-all mx-0.5',
              'hover:scale-125 hover:shadow-lg focus:scale-125 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'backdrop-blur-sm border',
              isHighlighted &&
                'bg-gradient-to-br from-blue-500 to-purple-500 text-white border-blue-400 shadow-blue-500/30 shadow-md',
              isSelected && 'bg-gradient-to-br from-purple-600 to-pink-600 text-white border-purple-500 shadow-purple-500/30 shadow-lg scale-110',
              !isHighlighted &&
                !isSelected &&
                'bg-white/80 text-gray-700 border-gray-300 dark:bg-gray-800/80 dark:text-gray-300 dark:border-gray-600 hover:border-blue-400'
            )}
            onClick={() => handleCitationClick(citationId)}
            onMouseEnter={() => handleCitationHover(citationId, true)}
            onMouseLeave={() => handleCitationHover(citationId, false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCitationClick(citationId);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Citation ${citationNumber}${source ? `: ${source.title}` : ''}`}
            aria-pressed={isSelected}
            aria-describedby={`citation-desc-${citationId}`}
          >
            {citationNumber}
          </sup>
        );
      }

      return <span key={`text-${index}`}>{part}</span>;
    });
  }, [
    processedContent,
    highlightedCitations,
    metadata.selectedCitationId,
    metadata.citations,
    metadata.sources,
    handleCitationClick,
    handleCitationHover,
  ]);

  const getSourceIcon = (type: CitationSource['type']) => {
    switch (type) {
      case 'document':
        return <FileTextIcon className="w-4 h-4" />;
      case 'webpage':
        return <LinkIcon className="w-4 h-4" />;
      default:
        return <FileTextIcon className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-gradient-to-br from-blue-50/30 via-white to-purple-50/30 dark:from-blue-950/20 dark:via-gray-900 dark:to-purple-950/20">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 xl:p-12 max-w-4xl mx-auto">
          <div className="mb-6 p-6 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
            <h1
              className="text-2xl sm:text-3xl font-bold mb-2"
              role="main"
              aria-label={`Citation article: ${title}`}
            >
              {title}
            </h1>
            <p className="text-blue-100">
              Verified information from your documents
            </p>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <div
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
            >
              <div
                className="whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200"
                role="article"
                aria-label="Article content with citations"
              >
                {renderContentWithCitations()}
              </div>
            </div>
          </div>

          {status === 'streaming' && (
            <div
              className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                aria-hidden="true"
              />
              Processing citations...
            </div>
          )}
        </div>
      </div>

      {/* Citation Sidebar */}
      <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-gray-200/50 dark:border-gray-800/50 flex flex-col bg-gradient-to-b from-gray-50/80 to-white/80 dark:from-gray-900/80 dark:to-gray-800/80 backdrop-blur-sm max-h-96 lg:max-h-none shadow-xl">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2
              className="text-base lg:text-lg font-semibold"
              role="complementary"
              aria-label="Citations and sources sidebar"
            >
              Sources & Citations
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowStatistics(!showStatistics)}
              className="h-8 w-8"
              aria-label={
                showStatistics ? 'Hide statistics' : 'Show statistics'
              }
              aria-pressed={showStatistics}
            >
              <BarChart2Icon className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1" role="status">
            {metadata.citations.length} citations from {metadata.sources.length}{' '}
            sources
          </p>
        </div>

        <AnimatePresence mode="wait">
          {showStatistics ? (
            <motion.div
              key="statistics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 overflow-hidden"
            >
              <CitationStatisticsPanel statistics={metadata.statistics} />
            </motion.div>
          ) : (
            <motion.div
              key="sources"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 overflow-hidden"
            >
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {metadata.sources.map((source) => {
                    const relatedCitations = metadata.citations.filter(
                      (c) => c.source.id === source.id
                    );
                    const isRelatedHighlighted = relatedCitations.some((c) =>
                      highlightedCitations.has(c.id)
                    );

                    return (
                      <Card
                        key={source.id}
                        className={cn(
                          'p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] focus-within:shadow-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
                          'bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50',
                          isRelatedHighlighted &&
                            'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 shadow-blue-500/20 shadow-lg scale-[1.02]'
                        )}
                        onClick={() => setSelectedSource(source)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedSource(source);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Open source: ${source.title}`}
                        aria-describedby={`source-desc-${source.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {getSourceIcon(source.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">
                              {source.title}
                            </h3>

                            {source.metadata?.excerpt && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {source.metadata.excerpt}
                              </p>
                            )}

                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {source.metadata?.author && (
                                <span className="flex items-center gap-1">
                                  <UserIcon className="w-3 h-3" />
                                  {source.metadata.author}
                                </span>
                              )}

                              {source.metadata?.date && (
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="w-3 h-3" />
                                  {new Date(
                                    source.metadata.date
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {relatedCitations.length} citation
                                {relatedCitations.length !== 1 ? 's' : ''}
                              </Badge>

                              {source.url && (
                                <ExternalLinkIcon className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          <ChevronRightIcon className="w-4 h-4 text-muted-foreground mt-1" />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hidden screen reader descriptions for citations */}
      <div className="sr-only">
        {metadata.citations.map((citation) => {
          const source = metadata.sources.find(
            (s) => s.id === citation.source.id
          );
          return (
            <div key={citation.id} id={`citation-desc-${citation.id}`}>
              Citation {metadata.citations.indexOf(citation) + 1}:{' '}
              {citation.text}
              {source && ` Source: ${source.title}`}
              {citation.relevanceScore &&
                ` Relevance: ${(citation.relevanceScore * 100).toFixed(0)}%`}
            </div>
          );
        })}
      </div>

      {/* Hidden screen reader descriptions for sources */}
      <div className="sr-only">
        {metadata.sources.map((source) => {
          const relatedCitations = metadata.citations.filter(
            (c) => c.source.id === source.id
          );
          return (
            <div key={source.id} id={`source-desc-${source.id}`}>
              Source: {source.title}. Type: {source.type}.
              {relatedCitations.length} citation
              {relatedCitations.length !== 1 ? 's' : ''}.
              {source.metadata?.author && ` Author: ${source.metadata.author}.`}
              {source.metadata?.date &&
                ` Date: ${new Date(source.metadata.date).toLocaleDateString()}.`}
              {source.metadata?.excerpt &&
                ` Excerpt: ${source.metadata.excerpt}`}
            </div>
          );
        })}
      </div>

      {/* Source Preview Modal */}
      {selectedSource && (
        <SourcePreviewModal
          source={selectedSource}
          citations={metadata.citations.filter(
            (c) => c.source.id === selectedSource.id
          )}
          onClose={() => setSelectedSource(null)}
        />
      )}
    </div>
  );
}
