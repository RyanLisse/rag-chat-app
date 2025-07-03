'use client';

import type { UIMessage } from 'ai';
import { motion } from 'framer-motion';
import { memo } from 'react';
import { Button } from './ui/button';
import type { VisibilityType } from './visibility-selector';

interface SuggestedActionsProps {
  chatId: string;
  append: (message: UIMessage) => void; // TODO: Fix for AI SDK 5.0
  selectedVisibilityType: VisibilityType;
}

function PureSuggestedActions({
  chatId,
  append,
  selectedVisibilityType,
}: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: 'Summarize my documents',
      label: 'and key insights',
      action:
        'Can you summarize my uploaded documents and provide key insights?',
    },
    {
      title: 'Search for specific information',
      label: 'in my knowledge base',
      action: 'Help me find specific information in my uploaded documents',
    },
    {
      title: 'Analyze and compare',
      label: 'different document sections',
      action:
        'Can you analyze and compare information across my uploaded documents?',
    },
    {
      title: 'Generate code examples',
      label: 'based on documentation',
      action:
        'Generate code examples based on the technical documentation I uploaded',
    },
  ];

  return (
    <div
      data-testid="suggested-actions"
      className="grid w-full gap-2 sm:grid-cols-2 max-w-2xl mx-auto"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              window.history.replaceState({}, '', `/chat/${chatId}`);

              append({
                id: `suggested-${Date.now()}`,
                role: 'user',
                parts: [{ type: 'text', text: suggestedAction.action }], // Updated for AI SDK 5.0
              });
            }}
            className="h-auto w-full flex-1 items-start justify-start gap-1 rounded-lg border px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
          >
            <span className="line-clamp-2 text-xs sm:text-sm">
              {suggestedAction.action}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }

    return true;
  }
);
