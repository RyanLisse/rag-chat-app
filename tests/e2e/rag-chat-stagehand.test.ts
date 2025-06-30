// E2E Tests using Stagehand for RAG Chat
import { test, expect, ragHelpers } from '../helpers/stagehand-integration';
import { createTestDocuments } from '../utils/vector-store-helpers';
import { validateCitationReferences } from '../utils/citation-validators';
import { createTestFile } from '../factories';

test.describe('RAG Chat with Stagehand', () => {
  test.beforeEach(async ({ stagehandPage }) => {
    await stagehandPage.goto('/');
    await stagehandPage.observe('Wait for the chat interface to load');
  });

  test('should handle document upload and search with AI assistance', async ({ stagehandPage }) => {
    // Use AI to understand the UI
    await stagehandPage.act('Click on the file upload button');
    
    // Upload test documents
    const testDocs = createTestDocuments();
    for (const doc of testDocs) {
      const file = createTestFile({ 
        name: doc.name, 
        content: doc.content,
        type: 'text/plain'
      });
      
      await stagehandPage.setInputFiles('[data-testid="file-input"]', file);
      await stagehandPage.observe('Confirm file upload is complete');
    }

    // Send a query that should trigger file search
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'What can you tell me about neural networks and deep learning?',
      { waitForResponse: true }
    );

    // Extract and validate citations
    const citations = await ragHelpers.extractCitations(stagehandPage);
    expect(citations.length).toBeGreaterThan(0);
    
    // Verify citations reference uploaded documents
    const citationSources = citations.map(c => c.source);
    expect(citationSources).toContain(expect.stringContaining('neural-networks.txt'));

    // Use AI to verify UI state
    const uiChecks = await ragHelpers.verifyUIState(stagehandPage, [
      'Citations are displayed in the sidebar',
      'Chat response contains numbered references like [1], [2]',
      'Uploaded files are listed in the interface',
    ]);
    
    expect(uiChecks).toBe(true);
  });

  test('should switch between AI models seamlessly', async ({ stagehandPage }) => {
    // Test model switching
    const models = ['GPT-4', 'Claude 3 Opus', 'Gemini Pro'];
    
    for (const model of models) {
      await ragHelpers.selectModel(stagehandPage, model);
      
      // Send a test message
      await ragHelpers.sendChatMessage(
        stagehandPage,
        `Testing response from ${model}`,
        { waitForResponse: true }
      );
      
      // Verify model is displayed
      await ragHelpers.assertContent(
        stagehandPage,
        `The current model indicator shows ${model}`
      );
    }
  });

  test('should maintain conversation context with citations', async ({ stagehandPage }) => {
    // Upload a document first
    await stagehandPage.act('Upload a document about AI fundamentals');
    await stagehandPage.observe('Wait for upload to complete');

    // Start a conversation
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'What are the key principles of machine learning?',
      { waitForResponse: true }
    );

    // Extract initial citations
    const firstCitations = await ragHelpers.extractCitations(stagehandPage);
    expect(firstCitations.length).toBeGreaterThan(0);

    // Follow-up question
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Can you elaborate on supervised learning specifically?',
      { waitForResponse: true }
    );

    // Verify conversation maintains context
    const history = await ragHelpers.getConversationHistory(stagehandPage);
    expect(history.length).toBe(4); // 2 user messages, 2 assistant responses
    
    // Check that follow-up response also has citations
    const secondCitations = await ragHelpers.extractCitations(stagehandPage);
    expect(secondCitations.length).toBeGreaterThan(0);
  });

  test('should handle complex RAG queries with natural language', async ({ stagehandPage }) => {
    // Use Stagehand's observe to understand current state
    const initialState = await stagehandPage.observe(
      'Describe the current state of the chat interface'
    );
    
    expect(initialState).toContain('empty');

    // Complex interaction flow
    await stagehandPage.act('Start a new conversation about comparing different AI architectures');
    
    // Upload multiple related documents
    await ragHelpers.uploadDocuments(stagehandPage, [
      'a research paper about transformer architectures',
      'a comparison of CNN vs RNN models',
      'a guide to modern NLP techniques',
    ]);

    // Ask a complex question requiring multiple sources
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Compare transformer architectures with traditional RNNs for NLP tasks. Include performance metrics and use cases.',
      { waitForResponse: true }
    );

    // Use AI to analyze the response quality
    const responseAnalysis = await stagehandPage.extract<{
      hasCitations: boolean;
      citationCount: number;
      mentionsTransformers: boolean;
      mentionsRNNs: boolean;
      includesComparison: boolean;
      includesMetrics: boolean;
    }>({
      instruction: 'Analyze the assistant response for quality indicators',
      schema: {
        type: 'object',
        properties: {
          hasCitations: { type: 'boolean' },
          citationCount: { type: 'number' },
          mentionsTransformers: { type: 'boolean' },
          mentionsRNNs: { type: 'boolean' },
          includesComparison: { type: 'boolean' },
          includesMetrics: { type: 'boolean' },
        },
      },
    });

    // Assert response quality
    expect(responseAnalysis.hasCitations).toBe(true);
    expect(responseAnalysis.citationCount).toBeGreaterThanOrEqual(2);
    expect(responseAnalysis.mentionsTransformers).toBe(true);
    expect(responseAnalysis.mentionsRNNs).toBe(true);
    expect(responseAnalysis.includesComparison).toBe(true);
  });

  test('should provide visual feedback during streaming responses', async ({ stagehandPage }) => {
    // Start a query
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Explain the concept of attention mechanisms in detail',
      { waitForResponse: false } // Don't wait for completion
    );

    // Observe streaming behavior
    const streamingIndicators = await stagehandPage.observe(
      'Check if there are visual indicators showing the response is being generated'
    );
    
    expect(streamingIndicators).toBeTruthy();

    // Wait for completion
    await stagehandPage.observe('Wait for the response to finish generating');

    // Verify streaming indicators are gone
    const postStreamState = await stagehandPage.observe(
      'Check if streaming indicators have disappeared'
    );
    
    expect(postStreamState).toBeTruthy();
  });
});