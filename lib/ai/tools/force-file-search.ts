import { CoreMessage } from 'ai';

/**
 * Creates a system message that forces immediate file search
 */
export function createFileSearchDirective(userQuery: string): CoreMessage {
  return {
    role: 'system',
    content: `IMMEDIATE ACTION REQUIRED: Call fileSearch with query: "${userQuery}" RIGHT NOW before any other action or response.`
  };
}

/**
 * Injects file search directive into message stream
 */
export function injectFileSearchDirective(messages: CoreMessage[]): CoreMessage[] {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  
  if (!lastUserMessage) {
    return messages;
  }

  // Check if we already have a file search directive
  const hasDirective = messages.some(
    m => m.role === 'system' && m.content?.toString().includes('IMMEDIATE ACTION REQUIRED')
  );

  if (hasDirective) {
    return messages;
  }

  // Find the index of the last user message
  const lastUserIndex = messages.lastIndexOf(lastUserMessage);
  
  // Create the directive
  const directive = createFileSearchDirective(lastUserMessage.content?.toString() || '');
  
  // Insert directive after the user message
  const updatedMessages = [...messages];
  updatedMessages.splice(lastUserIndex + 1, 0, directive);
  
  console.log('💉 Injected file search directive for:', lastUserMessage.content?.toString().substring(0, 50) + '...');
  
  return updatedMessages;
}