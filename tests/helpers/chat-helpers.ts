// Helper functions for chat testing
import { type Page, expect } from '@playwright/test';

export interface TestChatOptions {
  message: string;
  artifactType?: 'citation' | 'text' | 'code' | 'image' | 'sheet';
  mockEmpty?: boolean;
  mockLargeContent?: boolean;
}

export async function generateTestChatSession(page: Page, options: TestChatOptions) {
  const { message, artifactType = 'citation', mockEmpty = false, mockLargeContent = false } = options;

  // If mocking, set up the appropriate mock responses
  if (mockEmpty) {
    await page.route('**/api/chat**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: generateMockEmptyResponse(artifactType),
      });
    });
  } else if (mockLargeContent) {
    await page.route('**/api/chat**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: generateMockLargeResponse(artifactType),
      });
    });
  } else {
    await page.route('**/api/chat**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: generateMockCitationResponse(message),
      });
    });
  }

  // Send the message
  await page.fill('textarea[placeholder*="Send a message"]', message);
  await page.press('textarea[placeholder*="Send a message"]', 'Enter');

  // Wait for response to start
  await page.waitForTimeout(1000);

  return {
    message,
    artifactType,
  };
}

function generateMockEmptyResponse(artifactType: string): string {
  return [
    'data: {"type":"title","content":"Empty Test Document"}',
    'data: {"type":"kind","content":"' + artifactType + '"}',
    'data: {"type":"id","content":"empty-test-doc"}',
    'data: {"type":"clear","content":""}',
    'data: {"type":"' + artifactType + '-delta","content":"This is an empty test document with no citations."}',
    'data: {"type":"sources-update","content":[]}',
    'data: {"type":"citation-update","content":[]}',
    'data: {"type":"finish","content":""}',
    '',
  ].join('\\n');
}

function generateMockLargeResponse(artifactType: string): string {
  const largeCitations = Array.from({ length: 100 }, (_, i) => ({
    id: `citation-${i + 1}`,
    text: `Large document citation ${i + 1} with detailed content for performance testing.`,
    sourceId: `source-${Math.floor(i / 10) + 1}`,
    relevanceScore: 0.7 + (Math.random() * 0.3),
  }));

  const largeSources = Array.from({ length: 10 }, (_, i) => ({
    id: `source-${i + 1}`,
    title: `Performance Test Source ${i + 1}`,
    url: `https://example.com/source-${i + 1}`,
    type: ['document', 'webpage', 'api', 'database', 'file'][i % 5],
    metadata: {
      author: `Author ${i + 1}`,
      date: '2024-01-15',
      excerpt: `Excerpt for performance test source ${i + 1} with detailed information.`,
    },
  }));

  const largeContent = largeCitations
    .map((citation, index) => `${citation.text} [${index + 1}]`)
    .join(' ');

  return [
    'data: {"type":"title","content":"Large Performance Test Document"}',
    'data: {"type":"kind","content":"' + artifactType + '"}',
    'data: {"type":"id","content":"large-test-doc"}',
    'data: {"type":"clear","content":""}',
    'data: {"type":"' + artifactType + '-delta","content":"' + largeContent + '"}',
    'data: {"type":"sources-update","content":' + JSON.stringify(largeSources) + '}',
    'data: {"type":"citation-update","content":' + JSON.stringify(largeCitations) + '}',
    'data: {"type":"finish","content":""}',
    '',
  ].join('\\n');
}

function generateMockCitationResponse(message: string): string {
  const mockCitations = [
    {
      id: 'citation-1',
      text: 'Machine learning has revolutionized data analysis across industries',
      sourceId: 'source-1',
      relevanceScore: 0.9,
    },
    {
      id: 'citation-2',
      text: 'Neural networks demonstrate exceptional pattern recognition capabilities',
      sourceId: 'source-2',
      relevanceScore: 0.85,
    },
    {
      id: 'citation-3',
      text: 'Artificial intelligence continues to advance at an unprecedented pace',
      sourceId: 'source-1',
      relevanceScore: 0.8,
    },
  ];

  const mockSources = [
    {
      id: 'source-1',
      title: 'AI Research Summary 2024',
      url: 'https://example.com/ai-research-2024',
      type: 'document',
      metadata: {
        author: 'Dr. Jane Smith',
        date: '2024-01-15',
        excerpt: 'A comprehensive analysis of artificial intelligence developments in 2024.',
      },
    },
    {
      id: 'source-2',
      title: 'Neural Network Applications',
      url: 'https://tech-journal.com/neural-networks',
      type: 'webpage',
      metadata: {
        author: 'John Doe',
        date: '2024-02-20',
        excerpt: 'Exploring practical applications of neural networks in modern technology.',
      },
    },
  ];

  const content = 'Machine learning has revolutionized data analysis across industries [1]. Neural networks demonstrate exceptional pattern recognition capabilities [2]. Furthermore, artificial intelligence continues to advance at an unprecedented pace [3]. These technologies are transforming how we approach complex problems and data processing.';

  return [
    'data: {"type":"title","content":"AI Research Summary"}',
    'data: {"type":"kind","content":"citation"}',
    'data: {"type":"id","content":"test-citation-doc"}',
    'data: {"type":"clear","content":""}',
    'data: {"type":"citation-delta","content":"' + content + '"}',
    'data: {"type":"sources-update","content":' + JSON.stringify(mockSources) + '}',
    'data: {"type":"citation-update","content":' + JSON.stringify(mockCitations) + '}',
    'data: {"type":"finish","content":""}',
    '',
  ].join('\\n');
}

export async function waitForChatResponse(page: Page, timeout = 30000) {
  // Wait for response to appear
  await expect(page.locator('.message-content')).toBeVisible({ timeout });
}

export async function clearChatHistory(page: Page) {
  // Navigate to settings or use clear button if available
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}