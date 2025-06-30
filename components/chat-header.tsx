'use client';

import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { FileManagerDialog } from '@/components/file-manager-dialog';
import type { Session } from 'next-auth';
import { memo, useState, useEffect } from 'react';
import { FileIcon, PlusIcon } from './icons';
import { useSidebar } from './ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { VisibilitySelector, type VisibilityType } from './visibility-selector';

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  session,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const [fileManagerOpen, setFileManagerOpen] = useState(false);
  const [vectorStoreId, setVectorStoreId] = useState<string | undefined>();

  const { width: windowWidth } = useWindowSize();

  // Get or create vector store ID
  useEffect(() => {
    const initVectorStore = async () => {
      try {
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: new FormData(), // Empty form data to trigger vector store creation
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.vectorStoreId) {
            setVectorStoreId(data.vectorStoreId);
          }
        }
      } catch (error) {
        console.error('Error initializing vector store:', error);
      }
    };

    if (!vectorStoreId && process.env.NEXT_PUBLIC_OPENAI_VECTORSTORE_ID) {
      setVectorStoreId(process.env.NEXT_PUBLIC_OPENAI_VECTORSTORE_ID);
    } else {
      initVectorStore();
    }
  }, []);

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="order-2 ml-auto px-2 md:order-1 md:ml-0 md:h-fit md:px-2"
              onClick={() => {
                router.push('/');
                router.refresh();
              }}
            >
              <PlusIcon />
              <span className="md:sr-only">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
      )}

      {!isReadonly && (
        <ModelSelector
          session={session}
          selectedModelId={selectedModelId}
          className="order-1 md:order-2"
        />
      )}

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          className="order-1 md:order-3"
        />
      )}

      {!isReadonly && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="order-3 md:order-4 h-[34px] w-[34px] relative"
              onClick={() => setFileManagerOpen(true)}
            >
              <FileIcon size={16} />
              {vectorStoreId && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {vectorStoreId ? 'Knowledge Base Active' : 'Manage Knowledge Base'}
          </TooltipContent>
        </Tooltip>
      )}
      
      {vectorStoreId && (
        <div className="order-4 ml-auto hidden items-center gap-2 text-sm text-muted-foreground md:flex">
          <span className="h-2 w-2 bg-green-500 rounded-full" />
          <span>Vector Store Connected</span>
        </div>
      )}

      <FileManagerDialog
        open={fileManagerOpen}
        onOpenChange={setFileManagerOpen}
        vectorStoreId={vectorStoreId}
      />
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
