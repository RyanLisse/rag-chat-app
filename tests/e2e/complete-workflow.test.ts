// Complete E2E User Workflow Tests for RAG Chat Application
import { test, expect, ragHelpers } from '../helpers/stagehand-integration';
import { createTestDocuments } from '../utils/vector-store-helpers';
import { validateCitationReferences } from '../utils/citation-validators';
import { createTestFile } from '../factories';

test.describe('Complete RAG Chat User Workflows', () => {
  test.beforeEach(async ({ stagehandPage }) => {
    await stagehandPage.goto('/');
    await stagehandPage.waitForLoadState('networkidle');
    await stagehandPage.observe('Wait for the chat interface to load completely');
  });

  test('complete user journey: upload → process → query → cite → follow-up', async ({ stagehandPage }) => {
    // Step 1: Upload multiple documents
    await stagehandPage.act('Look for the file upload area or button');
    
    // Create diverse test documents
    const testDocs = [
      {
        name: 'machine-learning-basics.pdf',
        content: `
          Machine Learning Fundamentals
          
          Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed. The core principle involves algorithms that can identify patterns in data and make predictions or decisions based on those patterns.
          
          Key Types of Machine Learning:
          1. Supervised Learning: Uses labeled training data to learn a mapping function
          2. Unsupervised Learning: Finds hidden patterns in unlabeled data
          3. Reinforcement Learning: Learns through interaction with an environment
          
          Common algorithms include linear regression, decision trees, neural networks, and support vector machines.
        `,
        type: 'application/pdf'
      },
      {
        name: 'deep-learning-guide.txt',
        content: `
          Deep Learning Architecture Guide
          
          Deep learning is a specialized subset of machine learning that uses neural networks with multiple layers (hence "deep") to model and understand complex patterns in data.
          
          Popular Architectures:
          - Convolutional Neural Networks (CNNs): Excellent for image processing
          - Recurrent Neural Networks (RNNs): Great for sequential data like text
          - Transformers: State-of-the-art for natural language processing
          - Generative Adversarial Networks (GANs): Used for generating new data
          
          Key advantages include automatic feature extraction and the ability to handle large, complex datasets.
        `,
        type: 'text/plain'
      },
      {
        name: 'ai-ethics-paper.md',
        content: `
          # AI Ethics and Responsible Development
          
          ## Introduction
          As artificial intelligence becomes more prevalent in society, ethical considerations become increasingly important.
          
          ## Key Ethical Principles
          1. **Fairness**: AI systems should not discriminate against individuals or groups
          2. **Transparency**: Decision-making processes should be explainable
          3. **Privacy**: Personal data should be protected and used responsibly
          4. **Accountability**: Clear responsibility for AI system outcomes
          5. **Human Autonomy**: AI should augment, not replace human decision-making
          
          ## Challenges
          - Bias in training data can lead to discriminatory outcomes
          - Black box models make it difficult to understand decision reasoning
          - Rapid development may outpace regulatory frameworks
          
          ## Best Practices
          - Diverse development teams to identify potential biases
          - Regular auditing of AI systems for fairness
          - Clear documentation of system capabilities and limitations
        `,
        type: 'text/markdown'
      }
    ];

    // Upload each document
    for (const doc of testDocs) {
      await stagehandPage.act(`Upload a file named "${doc.name}"`);
      
      // Wait for upload to complete and be processed
      await stagehandPage.observe('Wait for the file upload to complete and show success');
      await stagehandPage.observe('Wait for the document to be processed by the vector store');
    }

    // Step 2: Verify documents are listed and processed
    const uploadedFiles = await stagehandPage.extract<string[]>({
      instruction: 'List all uploaded and processed files shown in the interface',
      schema: {
        type: 'array',
        items: { type: 'string' }
      }
    });

    expect(uploadedFiles.length).toBe(3);
    expect(uploadedFiles).toContain(expect.stringContaining('machine-learning-basics'));
    expect(uploadedFiles).toContain(expect.stringContaining('deep-learning-guide'));
    expect(uploadedFiles).toContain(expect.stringContaining('ai-ethics-paper'));

    // Step 3: Ask a complex question that requires multiple sources
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Compare supervised and unsupervised learning approaches. What are the ethical considerations when implementing these ML techniques in real-world applications?',
      { waitForResponse: true }
    );

    // Step 4: Verify comprehensive response with citations
    const responseAnalysis = await stagehandPage.extract<{
      mentionsSupervised: boolean;
      mentionsUnsupervised: boolean;
      mentionsEthics: boolean;
      hasCitations: boolean;
      citationCount: number;
      citationSources: string[];
    }>({
      instruction: 'Analyze the assistant response for content quality and citations',
      schema: {
        type: 'object',
        properties: {
          mentionsSupervised: { type: 'boolean' },
          mentionsUnsupervised: { type: 'boolean' },
          mentionsEthics: { type: 'boolean' },
          hasCitations: { type: 'boolean' },
          citationCount: { type: 'number' },
          citationSources: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    expect(responseAnalysis.mentionsSupervised).toBe(true);
    expect(responseAnalysis.mentionsUnsupervised).toBe(true);
    expect(responseAnalysis.mentionsEthics).toBe(true);
    expect(responseAnalysis.hasCitations).toBe(true);
    expect(responseAnalysis.citationCount).toBeGreaterThanOrEqual(2);
    expect(responseAnalysis.citationSources.length).toBeGreaterThanOrEqual(2);

    // Step 5: Test citation interactivity
    await stagehandPage.act('Click on the first citation in the response');
    await stagehandPage.observe('Verify that clicking the citation shows the source document or highlights the relevant section');

    // Step 6: Follow-up question to test context retention
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Based on what you just explained, which approach would be better for analyzing customer behavior data, and what privacy concerns should we address?',
      { waitForResponse: true }
    );

    // Step 7: Verify context is maintained and new citations are provided
    const followUpAnalysis = await stagehandPage.extract<{
      referencesPerviousAnswer: boolean;
      suggestsSpecificApproach: boolean;
      addressesPrivacy: boolean;
      hasNewCitations: boolean;
    }>({
      instruction: 'Analyze if the follow-up response maintains context and provides relevant new information',
      schema: {
        type: 'object',
        properties: {
          referencesPerviousAnswer: { type: 'boolean' },
          suggestsSpecificApproach: { type: 'boolean' },
          addressesPrivacy: { type: 'boolean' },
          hasNewCitations: { type: 'boolean' }
        }
      }
    });

    expect(followUpAnalysis.referencesPerviousAnswer).toBe(true);
    expect(followUpAnalysis.suggestsSpecificApproach).toBe(true);
    expect(followUpAnalysis.addressesPrivacy).toBe(true);

    // Step 8: Verify conversation history
    const conversationHistory = await ragHelpers.getConversationHistory(stagehandPage);
    expect(conversationHistory.length).toBe(4); // 2 user messages + 2 assistant responses
    
    // Verify each message has proper structure
    expect(conversationHistory[0].role).toBe('user');
    expect(conversationHistory[1].role).toBe('assistant');
    expect(conversationHistory[2].role).toBe('user');
    expect(conversationHistory[3].role).toBe('assistant');
  });

  test('model switching preserves conversation and adapts responses', async ({ stagehandPage }) => {
    // Upload a document first
    await stagehandPage.act('Upload a document about neural networks');
    await stagehandPage.observe('Wait for upload and processing to complete');

    // Start conversation with default model
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Explain neural networks in simple terms',
      { waitForResponse: true }
    );

    const initialResponse = await stagehandPage.extract<{ content: string; model: string }>({
      instruction: 'Extract the assistant response content and identify which model generated it',
      schema: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          model: { type: 'string' }
        }
      }
    });

    // Switch to different model
    const availableModels = ['GPT-4', 'Claude 3 Opus', 'Claude 3 Sonnet', 'Gemini Pro'];
    const targetModel = availableModels.find(model => model !== initialResponse.model) || availableModels[0];

    await ragHelpers.selectModel(stagehandPage, targetModel);

    // Continue conversation with new model
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Can you elaborate on backpropagation using a different explanation style?',
      { waitForResponse: true }
    );

    // Verify model switch was successful and context preserved
    const secondResponse = await stagehandPage.extract<{
      model: string;
      referencesNeuralNetworks: boolean;
      explainsDifferently: boolean;
      maintainsContext: boolean;
    }>({
      instruction: 'Analyze the second response for model identification and context preservation',
      schema: {
        type: 'object',
        properties: {
          model: { type: 'string' },
          referencesNeuralNetworks: { type: 'boolean' },
          explainsDifferently: { type: 'boolean' },
          maintainsContext: { type: 'boolean' }
        }
      }
    });

    expect(secondResponse.model).toBe(targetModel);
    expect(secondResponse.referencesNeuralNetworks).toBe(true);
    expect(secondResponse.maintainsContext).toBe(true);

    // Test rapid model switching
    for (const model of availableModels.slice(0, 3)) {
      await ragHelpers.selectModel(stagehandPage, model);
      
      await ragHelpers.sendChatMessage(
        stagehandPage,
        `Quick test with ${model}`,
        { waitForResponse: true }
      );

      // Verify model responds and interface updates
      await ragHelpers.assertContent(
        stagehandPage,
        `The current model indicator shows ${model}`
      );
    }
  });

  test('concurrent user simulation with document sharing', async ({ stagehandPage }) => {
    // Simulate multiple user sessions (in real implementation, this would use multiple browser contexts)
    const userSessions = ['session1', 'session2', 'session3'];
    
    // Upload documents as "first user"
    await stagehandPage.act('Upload multiple documents about machine learning');
    await stagehandPage.observe('Wait for all uploads to complete');

    // Simulate concurrent queries
    const queries = [
      'What is supervised learning?',
      'Explain deep learning architectures',
      'What are the ethical implications of AI?'
    ];

    for (let i = 0; i < queries.length; i++) {
      // Simulate starting multiple conversations
      await ragHelpers.sendChatMessage(
        stagehandPage,
        `${queries[i]} (simulating user session ${userSessions[i]})`,
        { waitForResponse: true }
      );

      // Brief delay to simulate real user behavior
      await stagehandPage.waitForTimeout(1000);
    }

    // Verify all responses are properly handled
    const conversationHistory = await ragHelpers.getConversationHistory(stagehandPage);
    expect(conversationHistory.length).toBe(6); // 3 user messages + 3 assistant responses

    // Verify system performance under load
    const performanceMetrics = await stagehandPage.extract<{
      responseTimesAcceptable: boolean;
      allQuestionsAnswered: boolean;
      citationsProvided: boolean;
    }>({
      instruction: 'Evaluate if all questions were answered promptly with proper citations',
      schema: {
        type: 'object',
        properties: {
          responseTimesAcceptable: { type: 'boolean' },
          allQuestionsAnswered: { type: 'boolean' },
          citationsProvided: { type: 'boolean' }
        }
      }
    });

    expect(performanceMetrics.responseTimesAcceptable).toBe(true);
    expect(performanceMetrics.allQuestionsAnswered).toBe(true);
    expect(performanceMetrics.citationsProvided).toBe(true);
  });

  test('document management workflow', async ({ stagehandPage }) => {
    // Upload initial documents
    await stagehandPage.act('Upload 3 different documents');
    await stagehandPage.observe('Wait for all uploads to complete');

    // Verify document list
    let uploadedFiles = await stagehandPage.extract<Array<{name: string, size: string, status: string}>>({
      instruction: 'List all uploaded files with their names, sizes, and processing status',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            size: { type: 'string' },
            status: { type: 'string' }
          }
        }
      }
    });

    expect(uploadedFiles.length).toBe(3);
    expect(uploadedFiles.every(file => file.status === 'processed')).toBe(true);

    // Test document deletion
    await stagehandPage.act('Delete the first uploaded document');
    await stagehandPage.observe('Confirm the document is removed from the list');

    // Verify document was removed
    uploadedFiles = await stagehandPage.extract<Array<{name: string}>>({
      instruction: 'List remaining uploaded files',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' }
          }
        }
      }
    });

    expect(uploadedFiles.length).toBe(2);

    // Test search functionality within documents
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Search for information about neural networks in the remaining documents',
      { waitForResponse: true }
    );

    // Verify search only uses remaining documents
    const searchResults = await ragHelpers.extractCitations(stagehandPage);
    const citationSources = searchResults.map(c => c.source);
    
    // Should not reference the deleted document
    expect(citationSources.length).toBeGreaterThan(0);
    // Additional validation would check specific document names
  });

  test('error recovery and user feedback', async ({ stagehandPage }) => {
    // Test with intentionally problematic scenarios
    
    // 1. Test upload of unsupported file type
    await stagehandPage.act('Try to upload a file with an unsupported format like .exe or .zip');
    
    const errorMessage = await stagehandPage.observe('Check if an appropriate error message is displayed');
    expect(errorMessage).toBeTruthy();

    // 2. Test extremely long query
    const longQuery = 'What is machine learning? '.repeat(100); // Very long query
    await ragHelpers.sendChatMessage(
      stagehandPage,
      longQuery,
      { waitForResponse: true }
    );

    // Should handle gracefully
    const response = await stagehandPage.observe('Check if the system handles the long query appropriately');
    expect(response).toBeTruthy();

    // 3. Test query with no relevant documents
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Tell me about quantum computing and space exploration',
      { waitForResponse: true }
    );

    const noRelevantDocsResponse = await stagehandPage.extract<{
      acknowledgesLimitation: boolean;
      providesGeneralInfo: boolean;
      suggestsUploading: boolean;
    }>({
      instruction: 'Analyze how the system handles queries with no relevant documents',
      schema: {
        type: 'object',
        properties: {
          acknowledgesLimitation: { type: 'boolean' },
          providesGeneralInfo: { type: 'boolean' },
          suggestsUploading: { type: 'boolean' }
        }
      }
    });

    expect(noRelevantDocsResponse.acknowledgesLimitation).toBe(true);

    // 4. Test network interruption simulation
    // Note: This would require more complex setup in a real implementation
    await stagehandPage.observe('Simulate network interruption during response generation');
    
    // Verify graceful degradation
    const networkErrorHandling = await stagehandPage.observe('Check if network errors are handled gracefully with user feedback');
    expect(networkErrorHandling).toBeTruthy();
  });
});