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
      title: 'How do I calibrate',
      label: 'the RoboRail system?',
      action: 'How do I calibrate the RoboRail system?',
    },
    {
      title: 'What are the safety procedures',
      label: 'for RoboRail?',
      action: 'What are the safety procedures for RoboRail?',
    },
    {
      title: 'Explain the error codes',
      label: 'for RoboRail diagnostics',
      action: 'Explain the error codes for RoboRail diagnostics',
    },
    {
      title: 'How do I perform maintenance',
      label: 'on the RoboRail system?',
      action: 'How do I perform maintenance on the RoboRail system?',
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
                id: `suggested-${crypto.randomUUID()}`,
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
