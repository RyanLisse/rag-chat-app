import type { CoreMessage } from 'ai';

/**
 * Middleware to enforce vector store search on every request
 * This ensures RAG functionality is always utilized
 */
export function enforceVectorSearch(messages: CoreMessage[]): CoreMessage[] {
  // Check if this is a new conversation or continuing one
  const _hasAssistantMessages = messages.some((m) => m.role === 'assistant');

  // Get the latest user message
  const latestUserMessage = messages.filter((m) => m.role === 'user').pop();

  if (!latestUserMessage) {
    return messages;
  }

  // Check if the assistant has already called fileSearch in this conversation
  const lastAssistantMessage = messages
    .filter((m) => m.role === 'assistant')
    .pop();
  const hasRecentFileSearch =
    lastAssistantMessage?.content?.toString().includes('fileSearch') ||
    lastAssistantMessage?.content?.toString().includes('vector store');

  // If no recent file search, prepend a system message to enforce it
  if (!hasRecentFileSearch) {
    const enforcementMessage: CoreMessage = {
      role: 'system',
      content: `SYSTEM ENFORCEMENT: You MUST call the fileSearch tool immediately with query: "${latestUserMessage.content}". Do not respond until you have searched the vector store.`,
    };

    // Insert the enforcement message before the latest user message
    const updatedMessages = [...messages];
    updatedMessages.splice(messages.length - 1, 0, enforcementMessage);

    console.log(
      '🔍 Vector search enforcement activated for query:',
      latestUserMessage.content
    );

    return updatedMessages;
  }

  return messages;
}

/**
 * Log vector store usage for monitoring
 */
export function logVectorStoreUsage(query: string, resultCount: number) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    query,
    resultCount,
    enforced: true,
  };

  console.log('📊 Vector Store Usage:', JSON.stringify(logEntry, null, 2));
}
