import { getDocumentById, saveSuggestions } from '@/lib/db/queries';
import type { Suggestion } from '@/lib/db/schema';
import { generateUUID } from '@/lib/utils';
import { streamObject, tool } from 'ai';
import type { Session } from 'next-auth';
import { z } from 'zod';
import { myProvider } from '../providers';

interface RequestSuggestionsProps {
  session: Session;
  dataStream: any; // TODO: Update type for AI SDK 5.0
}

// TODO: Reimplement requestSuggestions for AI SDK 5.0
// Tool execution signature has changed
export const requestSuggestions = ({
  session,
  dataStream,
}: RequestSuggestionsProps) => undefined;
