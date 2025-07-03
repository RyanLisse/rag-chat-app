#!/usr/bin/env bun

/**
 * Test script for OpenAI file search functionality
 * Run with: bun run scripts/test-file-search.ts
 */

import { resolve } from 'node:path';
import { config } from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  dangerouslyAllowBrowser: true,
});

async function testFileSearch() {
  console.log('🔍 Testing OpenAI File Search...\n');

  const vectorStoreId = process.env.OPENAI_VECTORSTORE_ID;

  if (!vectorStoreId) {
    console.error('❌ OPENAI_VECTORSTORE_ID not set in environment variables');
    process.exit(1);
  }

  console.log(`✅ Vector Store ID: ${vectorStoreId}`);

  try {
    // 1. Check vector store
    console.log('\n📊 Checking vector store...');
    const vectorStore = await openai.vectorStores.retrieve(vectorStoreId);
    console.log(`✅ Vector Store Name: ${vectorStore.name}`);
    console.log(`✅ Status: ${vectorStore.status}`);
    console.log(`✅ File Counts: ${JSON.stringify(vectorStore.file_counts)}`);

    // 2. List files in vector store
    console.log('\n📁 Listing files in vector store...');
    const files = await openai.vectorStores.files.list(vectorStoreId, {
      limit: 10,
    });
    console.log(`✅ Found ${files.data.length} files:`);

    for (const file of files.data) {
      console.log(`   - ${file.id}: Status=${file.status}`);
    }

    // 3. Create or retrieve assistant
    console.log('\n🤖 Setting up assistant...');
    let assistant;
    const assistantId = process.env.OPENAI_ASSISTANT_ID;

    if (assistantId) {
      try {
        assistant = await openai.beta.assistants.retrieve(assistantId);
        console.log(`✅ Using existing assistant: ${assistant.name}`);
      } catch {
        console.log('⚠️  Assistant not found, creating new one...');
      }
    }

    if (!assistant) {
      assistant = await openai.beta.assistants.create({
        name: 'Test File Search Assistant',
        instructions:
          'You are a helpful assistant that searches through documents.',
        model: 'gpt-4o',
        tools: [{ type: 'file_search' }],
      });
      console.log(`✅ Created new assistant: ${assistant.id}`);
    }

    // 4. Test search
    console.log('\n🔎 Testing file search...');
    const testQuery = 'What information is available in the documents?';
    console.log(`Query: "${testQuery}"`);

    // Create thread with file search
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: testQuery,
        },
      ],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStoreId],
        },
      },
    });
    console.log(`✅ Created thread: ${thread.id}`);

    // Run the assistant
    console.log('⏳ Running assistant (this may take a few seconds)...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });

    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;

    while (
      runStatus.status !== 'completed' &&
      runStatus.status !== 'failed' &&
      attempts < 30
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
      process.stdout.write(`\r⏳ Status: ${runStatus.status} (${attempts}s)`);
    }

    console.log(''); // New line after status updates

    if (runStatus.status === 'failed') {
      console.error('❌ Run failed:', runStatus.last_error);
      return;
    }

    if (runStatus.status !== 'completed') {
      console.error('❌ Run timed out');
      return;
    }

    console.log('✅ Run completed!');

    // Get the response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(
      (msg) => msg.role === 'assistant'
    );

    if (assistantMessage && assistantMessage.content[0].type === 'text') {
      const content = assistantMessage.content[0].text;
      console.log('\n📝 Response:');
      console.log(content.value);

      if (content.annotations && content.annotations.length > 0) {
        console.log(`\n📎 Found ${content.annotations.length} citations`);

        for (const annotation of content.annotations) {
          if (annotation.type === 'file_citation') {
            console.log(`   - File: ${annotation.file_citation.file_id}`);
            console.log(`     Quote: "${annotation.file_citation.quote}"`);
          }
        }
      } else {
        console.log('\n⚠️  No citations found in response');
      }
    }

    console.log('\n✅ File search test completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
    }
  }
}

// Run the test
testFileSearch().catch(console.error);
