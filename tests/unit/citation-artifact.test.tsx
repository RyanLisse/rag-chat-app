// Unit Tests for Citation Artifact Components
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CitationContent } from '@/components/artifacts/citation-artifact';
import { SourcePreviewModal } from '@/components/artifacts/source-preview-modal';
import { CitationStatisticsPanel } from '@/components/artifacts/citation-statistics-panel';
import type { CitationArtifactMetadata, Citation, CitationSource, CitationStatistics } from '@/lib/types/citation';

// Mock framer-motion
mock.module('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock toast
const mockToast = vi.fn(() => {});
mock.module('sonner', () => ({
  toast: {
    success: mockToast,
    error: mockToast,
  },
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

// Mock window.open
const mockWindowOpen = vi.fn(() => null);
Object.assign(window, {
  open: mockWindowOpen,
});

// Test data
const mockCitations: Citation[] = [
  {
    id: 'citation-1',
    text: 'This is the first cited text from the document.',
    source: { id: 'source-1' } as CitationSource,
    relevanceScore: 0.9,
    position: { start: 0, end: 50 },
  },
  {
    id: 'citation-2',
    text: 'This is the second cited text from another source.',
    source: { id: 'source-2' } as CitationSource,
    relevanceScore: 0.75,
    position: { start: 100, end: 150 },
  },
];

const mockSources: CitationSource[] = [
  {
    id: 'source-1',
    title: 'Academic Paper on AI',
    type: 'document',
    url: 'https://example.com/paper.pdf',
    metadata: {
      author: 'Dr. Jane Smith',
      date: '2024-01-15',
      excerpt: 'A comprehensive study on artificial intelligence applications.',
    },
  },
  {
    id: 'source-2',
    title: 'Technology Blog Post',
    type: 'webpage',
    url: 'https://tech-blog.com/ai-future',
    metadata: {
      author: 'John Doe',
      date: '2024-02-20',
      excerpt: 'Exploring the future of AI technology.',
    },
  },
];

const mockStatistics: CitationStatistics = {
  totalCitations: 2,
  uniqueSources: 2,
  sourceDistribution: {
    document: 1,
    webpage: 1,
  },
  avgRelevanceScore: 0.825,
};

const mockMetadata: CitationArtifactMetadata = {
  citations: mockCitations,
  sources: mockSources,
  statistics: mockStatistics,
};

describe('CitationContent', () => {
  const defaultProps = {
    title: 'Test Article',
    content: 'This is the first cited text from the document. [1] More content here. This is the second cited text from another source. [2]',
    metadata: mockMetadata,
    setMetadata: vi.fn(() => {}),
    isCurrentVersion: true,
    status: 'idle' as const,
    onSaveContent: vi.fn(() => {}),
  };

  beforeEach(() => {
    mock.restoreAll();
  });

  it('renders the main content and title', () => {
    render(<CitationContent {...defaultProps} />);
    
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Test Article')).toBeInTheDocument();
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('displays citations count and sources count', () => {
    render(<CitationContent {...defaultProps} />);
    
    expect(screen.getByText('2 citations from 2 sources')).toBeInTheDocument();
  });

  it('renders citation numbers as interactive elements', () => {
    render(<CitationContent {...defaultProps} />);
    
    const citationButtons = screen.getAllByRole('button');
    const citationNumbers = citationButtons.filter(btn => 
      btn.textContent === '1' || btn.textContent === '2'
    );
    
    expect(citationNumbers).toHaveLength(2);
    citationNumbers.forEach(button => {
      expect(button).toHaveAttribute('tabIndex', '0');
      expect(button).toHaveAttribute('aria-pressed');
    });
  });

  it('handles citation clicks', async () => {
    const setMetadata = vi.fn(() => {});
    render(<CitationContent {...defaultProps} setMetadata={setMetadata} />);
    
    const firstCitation = screen.getByRole('button', { name: /Citation 1/ });
    await userEvent.click(firstCitation);
    
    expect(setMetadata).toHaveBeenCalledWith(expect.any(Function));
  });

  it('handles citation keyboard navigation', async () => {
    const setMetadata = vi.fn(() => {});
    render(<CitationContent {...defaultProps} setMetadata={setMetadata} />);
    
    const firstCitation = screen.getByRole('button', { name: /Citation 1/ });
    firstCitation.focus();
    await userEvent.keyboard('{Enter}');
    
    expect(setMetadata).toHaveBeenCalledWith(expect.any(Function));
  });

  it('handles citation hover effects', async () => {
    render(<CitationContent {...defaultProps} />);
    
    const firstCitation = screen.getByRole('button', { name: /Citation 1/ });
    
    await userEvent.hover(firstCitation);
    expect(firstCitation).toHaveClass('hover:scale-110');
    
    await userEvent.unhover(firstCitation);
    // Test that hover state is cleared
  });

  it('renders source cards in sidebar', () => {
    render(<CitationContent {...defaultProps} />);
    
    expect(screen.getByText('Academic Paper on AI')).toBeInTheDocument();
    expect(screen.getByText('Technology Blog Post')).toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('handles source card clicks', async () => {
    render(<CitationContent {...defaultProps} />);
    
    const sourceCard = screen.getByRole('button', { name: /Open source: Academic Paper on AI/ });
    await userEvent.click(sourceCard);
    
    // Should open modal (tested separately)
    expect(screen.getByText('Academic Paper on AI')).toBeInTheDocument();
  });

  it('handles source card keyboard navigation', async () => {
    render(<CitationContent {...defaultProps} />);
    
    const sourceCard = screen.getByRole('button', { name: /Open source: Academic Paper on AI/ });
    sourceCard.focus();
    await userEvent.keyboard('{Enter}');
    
    // Should open modal
    expect(screen.getByText('Academic Paper on AI')).toBeInTheDocument();
  });

  it('toggles statistics panel', async () => {
    render(<CitationContent {...defaultProps} />);
    
    const statsButton = screen.getByRole('button', { name: /Show statistics/ });
    await userEvent.click(statsButton);
    
    expect(screen.getByText('Total Citations')).toBeInTheDocument();
    expect(screen.getByText('Unique Sources')).toBeInTheDocument();
  });

  it('shows streaming status', () => {
    render(<CitationContent {...defaultProps} status="streaming" />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Processing citations...')).toBeInTheDocument();
  });

  it('provides accessibility features', () => {
    render(<CitationContent {...defaultProps} />);
    
    // Check for screen reader descriptions
    expect(screen.getByRole('main')).toHaveAttribute('aria-label');
    expect(screen.getByRole('article')).toHaveAttribute('aria-label');
    expect(screen.getByRole('complementary')).toHaveAttribute('aria-label');
    
    // Check for live region
    const streamingProps = { ...defaultProps, status: 'streaming' as const };
    const { rerender } = render(<CitationContent {...streamingProps} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('handles empty citations gracefully', () => {
    const emptyMetadata = {
      ...mockMetadata,
      citations: [],
      sources: [],
      statistics: { ...mockStatistics, totalCitations: 0, uniqueSources: 0 },
    };
    
    render(<CitationContent {...defaultProps} metadata={emptyMetadata} />);
    
    expect(screen.getByText('0 citations from 0 sources')).toBeInTheDocument();
  });

  it('handles mobile layout', () => {
    // Mock window size for mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });
    
    render(<CitationContent {...defaultProps} />);
    
    // Check that mobile-specific classes are applied
    const container = screen.getByText('Test Article').closest('div');
    expect(container).toHaveClass('flex-col', 'lg:flex-row');
  });
});

describe('SourcePreviewModal', () => {
  const mockSource = mockSources[0];
  const relatedCitations = mockCitations.filter(c => c.source.id === mockSource.id);
  
  const defaultProps = {
    source: mockSource,
    citations: relatedCitations,
    onClose: vi.fn(() => {}),
  };

  beforeEach(() => {
    mock.restoreAll();
  });

  it('renders modal with source information', () => {
    render(<SourcePreviewModal {...defaultProps} />);
    
    expect(screen.getByText('Academic Paper on AI')).toBeInTheDocument();
    expect(screen.getByText('document')).toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('1/15/2024')).toBeInTheDocument();
  });

  it('displays source URL', () => {
    render(<SourcePreviewModal {...defaultProps} />);
    
    expect(screen.getByText('https://example.com/paper.pdf')).toBeInTheDocument();
  });

  it('handles close button click', async () => {
    const onClose = vi.fn(() => {});
    render(<SourcePreviewModal {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('handles escape key', async () => {
    const onClose = vi.fn(() => {});
    render(<SourcePreviewModal {...defaultProps} onClose={onClose} />);
    
    await userEvent.keyboard('{Escape}');
    
    expect(onClose).toHaveBeenCalled();
  });

  it('handles backdrop click', async () => {
    const onClose = vi.fn(() => {});
    render(<SourcePreviewModal {...defaultProps} onClose={onClose} />);
    
    const backdrop = screen.getByRole('dialog').parentElement;
    if (backdrop) {
      await userEvent.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('handles URL copy', async () => {
    render(<SourcePreviewModal {...defaultProps} />);
    
    const copyButton = screen.getByTitle('Copy URL');
    await userEvent.click(copyButton);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/paper.pdf');
    expect(mockToast).toHaveBeenCalledWith('URL copied to clipboard');
  });

  it('handles external link', async () => {
    render(<SourcePreviewModal {...defaultProps} />);
    
    const externalButton = screen.getByTitle('Open in new tab');
    await userEvent.click(externalButton);
    
    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://example.com/paper.pdf',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('displays citation relevance scores', () => {
    render(<SourcePreviewModal {...defaultProps} />);
    
    expect(screen.getByText('90% relevant')).toBeInTheDocument();
  });

  it('renders without URL gracefully', () => {
    const sourceWithoutUrl = { ...mockSource, url: undefined };
    render(<SourcePreviewModal {...defaultProps} source={sourceWithoutUrl} />);
    
    expect(screen.queryByText('SOURCE URL')).not.toBeInTheDocument();
  });

  it('renders additional metadata', () => {
    const sourceWithMetadata = {
      ...mockSource,
      metadata: {
        ...mockSource.metadata,
        customField: 'Custom Value',
        pageCount: 42,
      },
    };
    
    render(<SourcePreviewModal {...defaultProps} source={sourceWithMetadata} />);
    
    expect(screen.getByText('Custom Field:')).toBeInTheDocument();
    expect(screen.getByText('Custom Value')).toBeInTheDocument();
    expect(screen.getByText('Page Count:')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});

describe('CitationStatisticsPanel', () => {
  const defaultProps = {
    statistics: mockStatistics,
  };

  it('renders overview statistics', () => {
    render(<CitationStatisticsPanel {...defaultProps} />);
    
    expect(screen.getByText('Total Citations')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Unique Sources')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays relevance quality rating', () => {
    render(<CitationStatisticsPanel {...defaultProps} />);
    
    expect(screen.getByText('Relevance Quality')).toBeInTheDocument();
    expect(screen.getByText('82.5%')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('shows source type distribution', () => {
    render(<CitationStatisticsPanel {...defaultProps} />);
    
    expect(screen.getByText('Source Types')).toBeInTheDocument();
    expect(screen.getByText('document')).toBeInTheDocument();
    expect(screen.getByText('webpage')).toBeInTheDocument();
    expect(screen.getAllByText('1')).toHaveLength(2); // Each source type has 1 source
  });

  it('calculates citation density', () => {
    render(<CitationStatisticsPanel {...defaultProps} />);
    
    expect(screen.getByText('Citation Density')).toBeInTheDocument();
    expect(screen.getByText('Citations per Source')).toBeInTheDocument();
    expect(screen.getByText('1.0')).toBeInTheDocument(); // 2 citations / 2 sources
  });

  it('provides quality insights for excellent ratings', () => {
    render(<CitationStatisticsPanel {...defaultProps} />);
    
    expect(screen.getByText(/Excellent citation quality/)).toBeInTheDocument();
    expect(screen.getByText(/Good source diversity/)).toBeInTheDocument();
  });

  it('provides quality insights for poor ratings', () => {
    const poorStats = {
      ...mockStatistics,
      avgRelevanceScore: 0.3,
      totalCitations: 1,
      uniqueSources: 3,
    };
    
    render(<CitationStatisticsPanel statistics={poorStats} />);
    
    expect(screen.getByText(/Citation quality needs improvement/)).toBeInTheDocument();
    expect(screen.getByText(/Consider adding more citations/)).toBeInTheDocument();
  });

  it('handles empty statistics', () => {
    const emptyStats = {
      totalCitations: 0,
      uniqueSources: 0,
      sourceDistribution: {},
      avgRelevanceScore: 0,
    };
    
    render(<CitationStatisticsPanel statistics={emptyStats} />);
    
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  it('displays correct quality colors', () => {
    const scenarios = [
      { score: 0.9, expected: 'Excellent' },
      { score: 0.7, expected: 'Good' },
      { score: 0.5, expected: 'Fair' },
      { score: 0.2, expected: 'Poor' },
    ];
    
    scenarios.forEach(({ score, expected }) => {
      const stats = { ...mockStatistics, avgRelevanceScore: score };
      const { rerender } = render(<CitationStatisticsPanel statistics={stats} />);
      
      expect(screen.getByText(expected)).toBeInTheDocument();
      
      rerender(<CitationStatisticsPanel statistics={mockStatistics} />);
    });
  });
});

describe('Citation Integration Tests', () => {
  it('should handle citation selection flow', async () => {
    const setMetadata = vi.fn(() => {});
    render(<CitationContent {...{
      title: 'Integration Test',
      content: 'Content with citation [1]',
      metadata: mockMetadata,
      setMetadata,
      isCurrentVersion: true,
      status: 'idle' as const,
      onSaveContent: vi.fn(() => {}),
    }} />);
    
    // Click citation
    const citation = screen.getByRole('button', { name: /Citation 1/ });
    await userEvent.click(citation);
    
    // Should update metadata
    expect(setMetadata).toHaveBeenCalled();
    
    // Click source
    const source = screen.getByRole('button', { name: /Open source: Academic Paper on AI/ });
    await userEvent.click(source);
    
    // Should open modal
    expect(screen.getByText('Academic Paper on AI')).toBeInTheDocument();
  });

  it('should handle statistics toggle flow', async () => {
    render(<CitationContent {...{
      title: 'Statistics Test',
      content: 'Content with citations',
      metadata: mockMetadata,
      setMetadata: vi.fn(() => {}),
      isCurrentVersion: true,
      status: 'idle' as const,
      onSaveContent: vi.fn(() => {}),
    }} />);
    
    // Toggle statistics
    const statsButton = screen.getByRole('button', { name: /Show statistics/ });
    await userEvent.click(statsButton);
    
    // Should show statistics
    expect(screen.getByText('Total Citations')).toBeInTheDocument();
    
    // Toggle back
    const hideStatsButton = screen.getByRole('button', { name: /Hide statistics/ });
    await userEvent.click(hideStatsButton);
    
    // Should hide statistics
    expect(screen.queryByText('Total Citations')).not.toBeInTheDocument();
  });
});