'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Citation,
  CitationSource,
  CitationArtifactMetadata,
  CitationHighlight,
} from '@/lib/types/citation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileTextIcon,
  LinkIcon,
  CalendarIcon,
  UserIcon,
  ExternalLinkIcon,
  ChevronRightIcon,
  BarChart2Icon,
} from 'lucide-react';
import { SourcePreviewModal } from './source-preview-modal';
import { CitationStatisticsPanel } from './citation-statistics-panel';
import type { Dispatch, SetStateAction } from 'react';

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
              'inline-flex items-center justify-center w-5 h-5 text-xs rounded-full cursor-pointer transition-all',
              'hover:scale-110 hover:shadow-md focus:scale-110 focus:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
              isHighlighted &&
                'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
              isSelected && 'bg-blue-500 text-white',
              !isHighlighted &&
                !isSelected &&
                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
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
    <div className="flex flex-col lg:flex-row h-full">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 xl:p-12 max-w-4xl mx-auto">
          <h1
            className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6"
            role="main"
            aria-label={`Citation article: ${title}`}
          >
            {title}
          </h1>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <div
              className="whitespace-pre-wrap leading-relaxed"
              role="article"
              aria-label="Article content with citations"
            >
              {renderContentWithCitations()}
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
      <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-900/50 max-h-96 lg:max-h-none">
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
                          'p-4 cursor-pointer transition-all hover:shadow-md focus-within:shadow-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1',
                          isRelatedHighlighted &&
                            'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
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
