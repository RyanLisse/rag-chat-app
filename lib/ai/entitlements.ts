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
    availableChatModelIds: ['gpt-4o', 'gpt-4o-mini'],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4o-2025-07-01',
      'gpt-4o-mini-2025-07-01',
      'o1',
      'o1-preview',
      'o1-mini',
      'gpt-4-turbo',
      'gpt-4',
      'claude-4',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
    ],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
