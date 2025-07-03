#!/usr/bin/env bun

import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { databaseType, db } from '../lib/db/connection';
import * as schema from '../lib/db/turso-schema';

config({ path: '.env.local' });

async function testTursoConnection() {
  console.log('🔍 Testing Turso Database Connection...');
  console.log(`Database Type: ${databaseType}`);

  if (databaseType !== 'turso') {
    console.log(
      '⚠️  Not using Turso database. Set TURSO_DATABASE_URL to test Turso.'
    );
    return;
  }

  try {
    // Test 1: Create a test user
    console.log('\n1️⃣ Testing user creation...');
    const testUser = await db
      .insert(schema.user)
      .values({
        email: `test-${Date.now()}@example.com`,
        password: 'hashed-password',
      })
      .returning();
    console.log('✅ User created:', testUser[0].id);

    // Test 2: Query users
    console.log('\n2️⃣ Testing user query...');
    const users = await db.select().from(schema.user).limit(5);
    console.log(`✅ Found ${users.length} users`);

    // Test 3: Create a chat
    console.log('\n3️⃣ Testing chat creation...');
    const testChat = await db
      .insert(schema.chat)
      .values({
        title: 'Test Chat',
        userId: testUser[0].id,
        visibility: 'private',
      })
      .returning();
    console.log('✅ Chat created:', testChat[0].id);

    // Test 4: Create a message
    console.log('\n4️⃣ Testing message creation...');
    const testMessage = await db
      .insert(schema.message)
      .values({
        chatId: testChat[0].id,
        role: 'user',
        parts: JSON.stringify([{ type: 'text', text: 'Hello, Turso!' }]),
        attachments: JSON.stringify([]),
      })
      .returning();
    console.log('✅ Message created:', testMessage[0].id);

    // Test 5: Query with joins
    console.log('\n5️⃣ Testing complex query...');
    const chatsWithMessages = await db
      .select()
      .from(schema.chat)
      .where(eq(schema.chat.userId, testUser[0].id))
      .limit(10);
    console.log(`✅ Found ${chatsWithMessages.length} chats for user`);

    console.log('\n🎉 All tests passed! Turso is working correctly.');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testTursoConnection();
