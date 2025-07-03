import type { UIMessage } from 'ai';
import equal from 'fast-deep-equal';
import { motion } from 'framer-motion';
import { memo } from 'react';
import { useMessages } from '@/hooks/use-messages';
import type { Vote } from '@/lib/db/schema';
import { Greeting } from './greeting';
import { PreviewMessage, ThinkingMessage } from './message';
import type { VisibilityType } from './visibility-selector';

interface MessagesProps {
  chatId: string;
  status:
    | 'idle'
    | 'in_progress'
    | 'streaming'
    | 'awaiting_message'
    | 'submitted'; // TODO: Fix for AI SDK 5.0
  votes: Vote[] | undefined;
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void; // TODO: Fix for AI SDK 5.0
  reload: () => void; // TODO: Fix for AI SDK 5.0
  isReadonly: boolean;
  isArtifactVisible: boolean;
  append?: (message: UIMessage) => void; // TODO: Fix for AI SDK 5.0
  selectedVisibilityType?: VisibilityType;
}

function PureMessages({
  chatId,
  status,
  votes,
  messages,
  setMessages,
  reload,
  isReadonly,
  append,
  selectedVisibilityType,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    onViewportEnter,
    onViewportLeave,
    hasSentMessage,
  } = useMessages({
    chatId,
    status,
  });

  return (
    <div
      ref={messagesContainerRef}
      className="relative flex min-w-0 flex-1 flex-col gap-4 sm:gap-6 overflow-y-scroll pt-2 sm:pt-4 pb-24 sm:pb-32 px-2 sm:px-0"
    >
      {messages.length === 0 && append && selectedVisibilityType && (
        <Greeting
          chatId={chatId}
          append={append}
          selectedVisibilityType={selectedVisibilityType}
        />
      )}

      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
          chatId={chatId}
          message={message}
          isLoading={status === 'streaming' && messages.length - 1 === index}
          vote={
            votes
              ? votes.find((vote) => vote.messageId === message.id)
              : undefined
          }
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          requiresScrollPadding={
            hasSentMessage && index === messages.length - 1
          }
        />
      ))}

      {status === 'submitted' &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && <ThinkingMessage />}

      <motion.div
        ref={messagesEndRef}
        className="min-h-[24px] min-w-[24px] shrink-0"
        onViewportLeave={onViewportLeave}
        onViewportEnter={onViewportEnter}
      />
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) {
    return true;
  }

  if (prevProps.status !== nextProps.status) {
    return false;
  }
  if (prevProps.status && nextProps.status) {
    return false;
  }
  if (prevProps.messages.length !== nextProps.messages.length) {
    return false;
  }
  if (!equal(prevProps.messages, nextProps.messages)) {
    return false;
  }
  if (!equal(prevProps.votes, nextProps.votes)) {
    return false;
  }

  return true;
});
