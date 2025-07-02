'use client';

import type { DataPart } from '@/lib/types';
import type { UIMessage } from 'ai';
import { useEffect } from 'react';

export interface UseAutoResumeParams {
  autoResume: boolean;
  initialMessages: UIMessage[];
  experimental_resume: () => void; // TODO: Fix for AI SDK 5.0
  data: any; // TODO: Fix for AI SDK 5.0
  setMessages: (messages: UIMessage[]) => void; // TODO: Fix for AI SDK 5.0
}

export function useAutoResume({
  autoResume,
  initialMessages,
  experimental_resume,
  data,
  setMessages,
}: UseAutoResumeParams) {
  useEffect(() => {
    if (!autoResume) {
      return;
    }

    const mostRecentMessage = initialMessages.at(-1);

    if (mostRecentMessage?.role === 'user') {
      experimental_resume();
    }

    // we intentionally run this once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!data) {
      return;
    }
    if (data.length === 0) {
      return;
    }

    const dataPart = data[0] as DataPart;

    if (dataPart.type === 'append-message') {
      const message = JSON.parse(dataPart.message) as UIMessage;
      setMessages([...initialMessages, message]);
    }
  }, [data, initialMessages, setMessages]);
}
