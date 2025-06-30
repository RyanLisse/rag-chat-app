'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Citation, CitationSource } from '@/lib/types/citation';
import { cn } from '@/lib/utils';
import { FileText, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface CitationDisplayProps {
  content: string;
  citations: Citation[];
  sources: CitationSource[];
  className?: string;
}

export function CitationDisplay({
  content,
  citations,
  sources,
  className,
}: CitationDisplayProps) {
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);

  // Process content to add citation markers
  const processContentWithCitations = () => {
    if (!citations.length) return content;

    let processedContent = content;
    const citationsByPosition = [...citations].sort(
      (a, b) => b.position.start - a.position.start
    );

    citationsByPosition.forEach((citation, index) => {
      const citationNumber = citations.findIndex((c) => c.id === citation.id) + 1;
      const before = processedContent.slice(0, citation.position.end);
      const after = processedContent.slice(citation.position.end);
      processedContent = `${before}[${citationNumber}]${after}`;
    });

    return processedContent;
  };

  const renderContentWithCitations = () => {
    const processedContent = processContentWithCitations();
    const parts = processedContent.split(/(\[\d+\])/);

    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const citationNumber = parseInt(match[1], 10);
        const citation = citations[citationNumber - 1];
        if (!citation) return part;

        const source = sources.find((s) => s.id === citation.source.id);

        return (
          <Popover key={`citation-${index}`}>
            <PopoverTrigger asChild>
              <sup
                className={cn(
                  'inline-flex items-center justify-center w-5 h-5 text-xs rounded-full cursor-pointer transition-all ml-0.5',
                  'hover:scale-110 hover:shadow-md',
                  selectedCitation === citation.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                )}
                onClick={() =>
                  setSelectedCitation(
                    selectedCitation === citation.id ? null : citation.id
                  )
                }
              >
                {citationNumber}
              </sup>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{source?.title || 'Unknown Source'}</p>
                    {citation.text && (
                      <p className="text-xs text-muted-foreground">
                        &ldquo;{citation.text}&rdquo;
                      </p>
                    )}
                    {source?.metadata?.lastModified && (
                      <p className="text-xs text-muted-foreground">
                        Last modified:{' '}
                        {new Date(source.metadata.lastModified).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );
      }
      return <span key={`text-${index}`}>{part}</span>;
    });
  };

  if (!citations.length) {
    return <div className={className}>{content}</div>;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="prose prose-gray dark:prose-invert max-w-none">
        {renderContentWithCitations()}
      </div>

      {sources.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Sources</h4>
          <div className="space-y-2">
            {sources.map((source) => {
              const sourceCitations = citations.filter(
                (c) => c.source.id === source.id
              );
              return (
                <Card
                  key={source.id}
                  className="p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {source.title}
                      </p>
                      {source.metadata?.lastModified && (
                        <p className="text-xs text-muted-foreground">
                          Last modified:{' '}
                          {new Date(
                            source.metadata.lastModified
                          ).toLocaleDateString()}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {sourceCitations.length} citation
                          {sourceCitations.length !== 1 ? 's' : ''}
                        </Badge>
                        {source.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            asChild
                          >
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}