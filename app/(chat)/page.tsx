import { cookies } from 'next/headers';

import { Chat } from '@/components/chat';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DEFAULT_CHAT_MODEL, chatModels } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { redirect } from 'next/navigation';
import { auth } from '../(auth)/auth';

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  // Validate that the model from cookie exists, otherwise use default
  let initialChatModel = DEFAULT_CHAT_MODEL;
  if (modelIdFromCookie) {
    const modelExists = chatModels.some(
      (model) => model.id === modelIdFromCookie.value
    );
    if (modelExists) {
      initialChatModel = modelIdFromCookie.value;
    }
  }

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        initialChatModel={initialChatModel}
        initialVisibilityType="private"
        isReadonly={false}
        session={session}
        autoResume={false}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
