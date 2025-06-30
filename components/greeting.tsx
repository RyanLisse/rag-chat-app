import { motion } from 'framer-motion';
import type { UseChatHelpers } from '@ai-sdk/react';
import { SuggestedActions } from './suggested-actions';
import { FileSearchPrompt } from './file-search-prompt';
import type { VisibilityType } from './visibility-selector';

interface GreetingProps {
  chatId: string;
  append: UseChatHelpers['append'];
  selectedVisibilityType: VisibilityType;
}

export const Greeting = ({ chatId, append, selectedVisibilityType }: GreetingProps) => {
  return (
    <div
      key="overview"
      className="mx-auto flex size-full max-w-3xl flex-col justify-center px-8 md:mt-20"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
        className="font-semibold text-3xl mb-4"
      >
        Welcome to RoboRail Assistant!
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
        className="text-xl text-zinc-500 mb-8 max-w-2xl"
      >
        Ask me anything about RoboRail systems, calibration, safety, or operations.
      </motion.div>
      <FileSearchPrompt append={append} />
      <SuggestedActions 
        chatId={chatId}
        append={append}
        selectedVisibilityType={selectedVisibilityType}
      />
    </div>
  );
};
