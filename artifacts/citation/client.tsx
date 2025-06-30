import { Artifact } from '@/components/create-artifact';
import { DiffView } from '@/components/diffview';
import { DocumentSkeleton } from '@/components/document-skeleton';
import { CitationContent } from '@/components/artifacts/citation-artifact';
import {
  ClockRewind,
  CopyIcon,
  BarChartIcon,
  RefreshCwIcon,
  UndoIcon,
  RedoIcon,
  FileTextIcon,
  LinkIcon,
} from '@/components/icons';
import { toast } from 'sonner';
import { CitationArtifactMetadata } from '@/lib/types/citation';

export const citationArtifact = new Artifact<'citation', CitationArtifactMetadata>({
  kind: 'citation',
  description: 'AI responses with tracked citations and sources for verification.',
  initialize: async ({ documentId, setMetadata }) => {
    setMetadata({
      citations: [],
      sources: [],
      statistics: {
        totalCitations: 0,
        uniqueSources: 0,
        sourceDistribution: {},
        avgRelevanceScore: 0,
      },
    });
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    if (streamPart.type === 'citation-delta') {
      setArtifact((draftArtifact) => {
        return {
          ...draftArtifact,
          content: draftArtifact.content + (streamPart.content as string),
          isVisible:
            draftArtifact.status === 'streaming' &&
            draftArtifact.content.length > 300 &&
            draftArtifact.content.length < 350
              ? true
              : draftArtifact.isVisible,
          status: 'streaming',
        };
      });
    }

    if (streamPart.type === 'sources-update') {
      setMetadata((metadata) => {
        const sources = streamPart.content as any[];
        const sourceDistribution: Record<string, number> = {};
        
        sources.forEach((source) => {
          sourceDistribution[source.type] = (sourceDistribution[source.type] || 0) + 1;
        });

        return {
          ...metadata,
          sources,
          statistics: {
            ...metadata.statistics,
            uniqueSources: sources.length,
            sourceDistribution,
          },
        };
      });
    }

    if (streamPart.type === 'citation-update') {
      setMetadata((metadata) => {
        const citations = streamPart.content as any[];
        const totalRelevance = citations.reduce(
          (sum, citation) => sum + (citation.relevanceScore || 0.5),
          0
        );

        return {
          ...metadata,
          citations,
          statistics: {
            ...metadata.statistics,
            totalCitations: citations.length,
            avgRelevanceScore: citations.length > 0 ? totalRelevance / citations.length : 0,
          },
        };
      });
    }
  },
  content: ({
    title,
    mode,
    status,
    content,
    isCurrentVersion,
    currentVersionIndex,
    onSaveContent,
    getDocumentContentById,
    isLoading,
    metadata,
    setMetadata,
  }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="citation" />;
    }

    if (mode === 'diff') {
      const oldContent = getDocumentContentById(currentVersionIndex - 1);
      const newContent = getDocumentContentById(currentVersionIndex);
      return <DiffView oldContent={oldContent} newContent={newContent} />;
    }

    return (
      <CitationContent
        title={title}
        content={content}
        metadata={metadata}
        setMetadata={setMetadata}
        isCurrentVersion={isCurrentVersion}
        status={status}
        onSaveContent={onSaveContent}
      />
    );
  },
  actions: [
    {
      icon: <ClockRewind size={18} />,
      description: 'View changes',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('toggle');
      },
      isDisabled: ({ currentVersionIndex }) => currentVersionIndex === 0,
    },
    {
      icon: <UndoIcon size={18} />,
      description: 'View Previous version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => currentVersionIndex === 0,
    },
    {
      icon: <RedoIcon size={18} />,
      description: 'View Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => isCurrentVersion,
    },
    {
      icon: <BarChartIcon size={18} />,
      description: 'Toggle statistics',
      onClick: ({ setMetadata }) => {
        setMetadata((metadata) => ({
          ...metadata,
          showStatistics: !metadata.showStatistics,
        }));
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy to clipboard',
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard!');
      },
    },
  ],
  toolbar: [
    {
      icon: <FileTextIcon />,
      description: 'Add more citations',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'Please add more citations and sources to support the claims in your response.',
        });
      },
    },
    {
      icon: <LinkIcon />,
      description: 'Verify sources',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'Please verify all the sources and ensure the citations are accurate.',
        });
      },
    },
    {
      icon: <RefreshCwIcon />,
      description: 'Update citations',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'Please update the citations with the most recent sources available.',
        });
      },
    },
  ],
});