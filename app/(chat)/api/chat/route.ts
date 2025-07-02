import { type UserType, auth } from '@/app/(auth)/auth';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import { myProvider } from '@/lib/ai/providers';
import { createDocument } from '@/lib/ai/tools/create-document';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { retrievalSearchTool } from '@/lib/ai/tools/retrieval-search';
import { createCitationTool } from '@/lib/ai/tools/create-citation';
import { imageAnalysisTool } from '@/lib/ai/tools/image-analysis';
import { isProductionEnvironment } from '@/lib/constants';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getStreamIdsByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import type { Chat } from '@/lib/db/schema';
import { ChatSDKError } from '@/lib/errors';
import { generateUUID, getTrailingMessageId } from '@/lib/utils';
import { enforceVectorSearch } from '@/lib/ai/middleware/enforce-vector-search';
import { injectFileSearchDirective } from '@/lib/ai/tools/force-file-search';
import { geolocation } from '@vercel/functions';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  streamText,
  type UIMessage,
  type CoreMessage,
} from 'ai';
import { differenceInSeconds } from 'date-fns';
import { after } from 'next/server';
import {
  type ResumableStreamContext,
  createResumableStreamContext,
} from 'resumable-stream';
import { generateTitleFromUserMessage } from '../../actions';
import { type PostRequestBody, postRequestBodySchema } from './schema';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const { id, message, selectedChatModel, selectedVisibilityType } =
      requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: {
          ...message,
          id: message.id || generateUUID(),
        } as UIMessage,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else if (chat.userId !== session.user.id) {
      return new ChatSDKError('forbidden:chat').toResponse();
    }

    const previousMessages = await getMessagesByChatId({ id });

    let messages = [...previousMessages, message] as UIMessage[];
    
    // Convert UI messages to Core messages for processing
    const modelMessages = convertToModelMessages(messages);
    
    // Enforce vector search on every request (CoreMessage is an alias for ModelMessage)
    const coreMessages = enforceVectorSearch(modelMessages);
    
    // Also inject a directive to ensure immediate file search
    const messagesWithDirective = injectFileSearchDirective(coreMessages);

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: message.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    const streamContext = getStreamContext();

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: messagesWithDirective,
          maxRetries: 3, // Allow retries for tools
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                  // TODO: Re-enable all tools after AI SDK 5.0 migration
                  // 'getWeather',
                  // 'createDocument',
                  // 'updateDocument',
                  // 'requestSuggestions',
                  // 'fileSearch',
                  // 'analyzeImage',
                ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          _internal: {
            generateId: generateUUID,
          },
          tools: {
            // TODO: Re-enable all tools after AI SDK 5.0 migration
            // getWeather,
            // createDocument: createDocument({ session, dataStream: writer }),
            // updateDocument: updateDocument({ session, dataStream: writer }),
            // requestSuggestions: requestSuggestions({
            //   session,
            //   dataStream: writer,
            // }),
            // fileSearch: retrievalSearchTool({ dataStream: writer }),
            // createCitation: createCitationTool,
            // analyzeImage: imageAnalysisTool({ dataStream: writer }),
          },
          onFinish: async ({ text, content, totalUsage }) => {
            if (session.user?.id) {
              try {
                // Generate ID for the assistant message
                const assistantId = generateUUID();

                // Convert content to parts format for database
                const parts = content.map(part => {
                  if (part.type === 'text') {
                    return { type: 'text', text: part.text };
                  } else if (part.type === 'reasoning') {
                    return { type: 'text', text: part.text };
                  }
                  // TODO: Re-enable tool-related parts after AI SDK 5.0 migration
                  // else if (part.type === 'tool-call') {
                  //   return { 
                  //     type: 'tool-call', 
                  //     toolCallId: part.toolCallId,
                  //     toolName: part.toolName,
                  //     args: part.input,
                  //   };
                  // } else if (part.type === 'tool-result') {
                  //   return { 
                  //     type: 'tool-result', 
                  //     toolCallId: part.toolCallId,
                  //     toolName: part.toolName,
                  //     result: part.output,
                  //   };
                  else if (part.type === 'file') {
                    return { 
                      type: 'file', 
                      mediaType: part.file.mediaType,
                      data: part.file.base64,
                    };
                  }
                  return { type: part.type, text: JSON.stringify(part) };
                });

                // If no content parts but we have text, create a text part
                if (parts.length === 0 && text) {
                  parts.push({ type: 'text', text });
                }

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: 'assistant',
                      parts,
                      attachments: [],
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch (error) {
                console.error('Failed to save chat:', error);
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        writer.merge(result.toUIMessageStream({
          sendReasoning: true,
        }));
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    // TODO: Fix resumable stream integration with AI SDK 5.0
    // The stream types have changed and need proper conversion
    return createUIMessageStreamResponse({
      stream,
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
  }
}

export async function GET(request: Request) {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  let chat: Chat;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.visibility === 'private' && chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const emptyDataStream = createUIMessageStream({
    execute: () => {},
  });

  // TODO: Fix resumable stream integration with AI SDK 5.0
  const stream = null; // Temporarily disable resumable streams

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 });
    }

    if (mostRecentMessage.role !== 'assistant') {
      return new Response(emptyDataStream, { status: 200 });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 });
    }

    // TODO: Fix message restoration with AI SDK 5.0 stream format
    const restoredStream = createUIMessageStream({
      execute: () => {
        // Simplified for now - message restoration needs to be implemented
        // with the new stream part format
      },
    });

    return new Response(restoredStream, { status: 200 });
  }

  return new Response(stream, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
