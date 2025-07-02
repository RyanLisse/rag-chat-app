'use client';

import { ChatHeader } from '@/components/chat-header';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import type { Vote } from '@/lib/db/schema';
import { ChatSDKError } from '@/lib/errors';
import { fetchWithErrorHandlers, fetcher, generateUUID } from '@/lib/utils';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
// TODO: Find correct Attachment type in AI SDK 5.0
import type { Session } from 'next-auth';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { unstable_serialize } from 'swr/infinite';
import { Artifact } from './artifact';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import type { VisibilityType } from './visibility-selector';
import { VectorStoreMonitor } from './vector-store-monitor';

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
}: {
  id: string;
  initialMessages: UIMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
}) {
  const { mutate } = useSWRConfig();

  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const {
    messages,
    setMessages,
    // handleSubmit, // TODO: Fix for AI SDK 5.0
    // input, // TODO: Fix for AI SDK 5.0
    // setInput, // TODO: Fix for AI SDK 5.0
    // append, // TODO: Fix for AI SDK 5.0
    status: chatStatus,
    stop,
    // reload, // TODO: Fix for AI SDK 5.0
    // experimental_resume, // TODO: Fix for AI SDK 5.0
    // data, // TODO: Fix for AI SDK 5.0
  } = useChat({
    // api: '/api/chat', // TODO: Fix for AI SDK 5.0
    id,
    // initialMessages, // TODO: Fix for AI SDK 5.0
    // experimental_throttle: 100, // TODO: Fix for AI SDK 5.0
    // sendExtraMessageFields: true, // TODO: Fix for AI SDK 5.0
    // generateId: generateUUID, // TODO: Fix for AI SDK 5.0
    // fetch: fetchWithErrorHandlers, // TODO: Fix for AI SDK 5.0
    // experimental_prepareRequestBody: (body) => {
    //   const lastMessage = body.messages.at(-1);
    //   
    //   // Ensure the message has the correct format
    //   const formattedMessage = {
    //     ...lastMessage,
    //     parts: lastMessage.parts || [{ type: 'text', text: lastMessage.content || '' }],
    //   };
    //   
    //   const requestBody = {
    //     id,
    //     message: formattedMessage,
    //     selectedChatModel: initialChatModel,
    //     selectedVisibilityType: visibilityType,
    //   };
    //   
    //   console.log('Sending message to API:', JSON.stringify(requestBody, null, 2));
    //   
    //   return requestBody;
    // }, // TODO: Fix for AI SDK 5.0
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({
          type: 'error',
          description: error.message,
        });
      }
    },
  });

  // TODO: Implement these for AI SDK 5.0
  const [input, setInput] = useState('');
  const data = undefined; // TODO: Fix for AI SDK 5.0
  
  // Convert chatStatus to expected format
  const status: 'idle' | 'in_progress' | 'streaming' | 'awaiting_message' | 'submitted' = 
    chatStatus === 'error' ? 'idle' : (chatStatus as any); // TODO: Fix proper type conversion
  
  const append = (message: UIMessage) => {
    // Handle message append - to be implemented
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission - to be implemented
  };
  
  const reload = () => {
    // Handle reload - to be implemented
  };
  
  const experimental_resume = () => {
    // Handle resume - to be implemented
  };

  const searchParams = useSearchParams();
  const query = searchParams.get('query');

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      append({
        id: generateUUID(),
        role: 'user',
        parts: [{ type: 'text', text: query }], // Updated for AI SDK 5.0
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, append, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Vote[]>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher
  );

  const [attachments, setAttachments] = useState<any[]>([]); // TODO: Fix Attachment type for AI SDK 5.0
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    experimental_resume,
    data,
    setMessages,
  });

  return (
    <>
      <div className="flex h-dvh min-w-0 flex-col bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={initialChatModel}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
        />

        {/* Vector Store Activity Monitor */}
        {process.env.NODE_ENV === 'development' && <VectorStoreMonitor />}

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
          append={append}
          selectedVisibilityType={visibilityType}
        />

        <form className="mx-auto flex w-full gap-2 bg-background px-2 pb-2 sm:px-3 sm:pb-3 md:px-4 md:pb-4 md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
              selectedVisibilityType={visibilityType}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
      />
    </>
  );
}
