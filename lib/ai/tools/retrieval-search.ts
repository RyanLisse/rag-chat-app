import OpenAI from 'openai';

// Initialize OpenAI client (server-side only)
const _openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * New Retrieval API implementation for semantic search
 * Replaces the deprecated Assistants API file search
 */
// TODO: Reimplement retrievalSearchTool for AI SDK 5.0
// Tool execution signature has changed
export const retrievalSearchTool = ({
  dataStream,
}: {
  dataStream?: any;
} = {}) => undefined;
