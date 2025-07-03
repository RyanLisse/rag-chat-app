import type { UIMessage } from 'ai';
import { motion } from 'framer-motion';
import { SuggestedActions } from './suggested-actions';
import type { VisibilityType } from './visibility-selector';

interface GreetingProps {
  chatId: string;
  append: (message: UIMessage) => void; // TODO: Fix for AI SDK 5.0
  selectedVisibilityType: VisibilityType;
}

export const Greeting = ({
  chatId,
  append,
  selectedVisibilityType,
}: GreetingProps) => {
  return (
    <div
      key="overview"
      className="mx-auto flex size-full max-w-3xl flex-col justify-center px-4 sm:px-6 md:px-8 mt-8 sm:mt-12 md:mt-20"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
        className="font-semibold text-xl sm:text-2xl md:text-3xl mb-2 sm:mb-3"
      >
        Welcome to RoboRail Assistant!
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
        className="text-sm sm:text-base md:text-xl text-zinc-500 mb-4 sm:mb-6 max-w-2xl"
      >
        Ask me anything about RoboRail systems, calibration, safety, or
        operations.
      </motion.div>
      <SuggestedActions
        chatId={chatId}
        append={append}
        selectedVisibilityType={selectedVisibilityType}
      />
    </div>
  );
};
