import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleTurso } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import postgres from 'postgres';
import * as pgSchema from './schema';
import * as tursoSchema from './turso-schema';

config({
  path: '.env.local',
});

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

// Determine database type
const isTurso = !!tursoUrl;
const isFileUrl = databaseUrl?.startsWith('file:');
const isPostgres = databaseUrl?.startsWith('postgres');

if (!databaseUrl && !tursoUrl) {
  throw new Error('DATABASE_URL, POSTGRES_URL, or TURSO_DATABASE_URL must be defined');
}

let db: any;
let databaseType: string;

if (isTurso) {
  // Use Turso database
  console.log('Using Turso database');
  const client = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken,
  });
  db = drizzleTurso(client, { schema: tursoSchema });
  databaseType = 'turso';
} else if (isFileUrl) {
  // Create a mock database for local development
  console.log('Using mock database for local development');
  db = createMockDB();
  databaseType = 'mock';
} else if (isPostgres) {
  // Use actual PostgreSQL connection
  try {
    const connection = postgres(databaseUrl!, { 
      max: 1,
      connect_timeout: 5,
    });
    db = drizzle(connection, { schema: pgSchema });
    databaseType = 'postgres';
  } catch (error) {
    console.warn('Database connection failed, using mock database');
    db = createMockDB();
    databaseType = 'mock';
  }
} else {
  throw new Error('Unsupported database URL format');
}

// Mock database for local development without PostgreSQL
function createMockDB() {
  const userId = 'guest-user-' + Date.now();
  const mockUser = {
    id: userId,
    email: 'guest@localhost',
    password: 'mock-hashed-password',
    createdAt: new Date(),
  };

  // In-memory storage for mock data
  const mockData = {
    users: [mockUser],
    chats: [] as any[],
    messages: [] as any[],
    documents: [] as any[],
    suggestions: [] as any[],
    votes: [] as any[],
  };

  // Use appropriate schema based on database type
  const schema = isTurso ? tursoSchema : pgSchema;

  const mockDB = {
    select: (fields?: any) => ({
      from: (table: any) => ({
        where: (condition?: any) => {
          // Return mock user for auth queries
          if (table === schema.user) {
            return Promise.resolve([mockUser]);
          }
          // Return empty chats for chat queries
          if (table === schema.chat) {
            const userChats = mockData.chats.filter(c => c.userId === userId);
            return Promise.resolve(userChats);
          }
          // Return messages for message queries
          if (table === schema.message) {
            return Promise.resolve(mockData.messages);
          }
          return Promise.resolve([]);
        },
        limit: (n: number) => {
          if (table === schema.chat) {
            const userChats = mockData.chats.filter(c => c.userId === userId);
            return Promise.resolve(userChats.slice(0, n));
          }
          return Promise.resolve([]);
        },
        orderBy: (order: any) => ({
          limit: (n: number) => {
            if (table === schema.chat) {
              const userChats = mockData.chats
                .filter(c => c.userId === userId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              return Promise.resolve(userChats.slice(0, n));
            }
            return Promise.resolve([]);
          },
          where: (condition?: any) => {
            if (table === schema.chat) {
              const userChats = mockData.chats.filter(c => c.userId === userId);
              return Promise.resolve(userChats);
            }
            return Promise.resolve([]);
          },
        }),
      }),
    }),
    insert: (table: any) => ({
      values: (values: any) => {
        const newItem = { ...values, id: values.id || crypto.randomUUID() };
        
        if (table === schema.user) {
          return {
            returning: () => Promise.resolve([{ ...mockUser, ...values }]),
          };
        }
        if (table === schema.chat) {
          newItem.createdAt = newItem.createdAt || new Date().toISOString();
          mockData.chats.push(newItem);
          return {
            returning: () => Promise.resolve([newItem]),
          };
        }
        if (table === schema.message) {
          newItem.createdAt = newItem.createdAt || new Date().toISOString();
          mockData.messages.push(newItem);
          return {
            returning: () => Promise.resolve([newItem]),
          };
        }
        return {
          returning: () => Promise.resolve([newItem]),
        };
      },
    }),
    update: (table: any) => ({
      set: (values: any) => ({
        where: (condition: any) => Promise.resolve([]),
      }),
    }),
    delete: (table: any) => ({
      where: (condition: any) => Promise.resolve([]),
    }),
  };

  return mockDB;
}

export { db, databaseType };