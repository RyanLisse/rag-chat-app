#!/usr/bin/env bun

import { generateUUID } from '../lib/utils';

async function testChatAPI() {
  console.log('🔍 Testing Chat API...\n');

  // First, get a session
  console.log('1️⃣ Getting guest session...');
  const authResponse = await fetch('http://localhost:3000/api/auth/guest', {
    redirect: 'follow',
  });
  
  const cookies = authResponse.headers.get('set-cookie');
  if (!cookies) {
    console.error('❌ Failed to get session cookie');
    return;
  }
  
  console.log('✅ Got session cookie\n');

  // Test the chat API
  console.log('2️⃣ Testing chat API...');
  const chatId = generateUUID();
  const messageId = generateUUID();
  
  const chatRequest = {
    id: chatId,
    message: {
      role: 'user',
      content: 'What is 2 + 2?',
      id: messageId,
      createdAt: new Date().toISOString(),
      parts: [
        {
          type: 'text',
          text: 'What is 2 + 2?',
        },
      ],
    },
    selectedChatModel: 'gpt-4.1',
    selectedVisibilityType: 'private' as const,
  };

  console.log('Request:', JSON.stringify(chatRequest, null, 2));

  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies,
    },
    body: JSON.stringify(chatRequest),
  });

  console.log('\nResponse status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const text = await response.text();
    console.error('❌ Error response:', text);
    return;
  }

  console.log('\n✅ Chat API is working!');
  
  // Read the stream
  const reader = response.body?.getReader();
  if (!reader) {
    console.error('❌ No response body');
    return;
  }

  console.log('\n3️⃣ Reading stream response...');
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (line.startsWith('0:')) {
        console.log('Message:', line.substring(2));
      } else if (line.startsWith('e:')) {
        const data = JSON.parse(line.substring(2));
        console.log('Finished:', data);
      }
    }
  }
}

testChatAPI().catch(console.error);