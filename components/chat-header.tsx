'use client';

import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { FileManagerDialog } from '@/components/file-manager-dialog';
import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import type { Session } from 'next-auth';
import { memo, useEffect, useState } from 'react';
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
        const response = await fetch('/api/vector-store/init', {
          method: 'POST',
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

    if (!vectorStoreId) {
      initVectorStore();
    }
  }, []);

  return (
    <header className="sticky top-0 z-10 flex items-center gap-1 sm:gap-2 bg-background px-2 py-1 sm:py-1.5 md:px-2 border-b">
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="order-2 ml-auto h-8 w-8 md:h-fit md:w-auto md:px-2 md:order-1 md:ml-0"
              size="icon"
              onClick={() => {
                router.push('/');
                router.refresh();
              }}
            >
              <PlusIcon size={16} />
              <span className="sr-only md:not-sr-only md:ml-1">New Chat</span>
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
              className="order-3 md:order-4 h-8 md:h-9 text-xs md:text-sm px-2 md:px-3 relative flex items-center gap-1 md:gap-2"
              onClick={() => setFileManagerOpen(true)}
            >
              <FileIcon size={14} />
              <span className="hidden sm:inline">Upload</span>
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
