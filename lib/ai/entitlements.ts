import type { UserType } from '@/app/(auth)/auth';
import type { ChatModel } from './models';

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: ChatModel['id'][];
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: ['gpt-4.1', 'o4-mini'],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: [
      'gpt-4.1',
      'o4-mini',
      'claude-4',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
    ],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
