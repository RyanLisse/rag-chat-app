export interface Citation {
  id: string;
  source: CitationSource;
  text: string;
  relevanceScore?: number;
  position: {
    start: number;
    end: number;
  };
}

export interface CitationSource {
  id: string;
  title: string;
  url?: string;
  type: 'document' | 'webpage' | 'api' | 'database' | 'file';
  metadata?: {
    author?: string;
    date?: string;
    lastModified?: string;
    excerpt?: string;
    [key: string]: any;
  };
}

export interface CitationStatistics {
  totalCitations: number;
  uniqueSources: number;
  sourceDistribution: Record<string, number>;
  avgRelevanceScore: number;
}

export interface CitationArtifactMetadata {
  citations: Citation[];
  sources: CitationSource[];
  statistics: CitationStatistics;
  selectedCitationId?: string;
}

export interface CitationHighlight {
  citationId: string;
  isActive: boolean;
}
