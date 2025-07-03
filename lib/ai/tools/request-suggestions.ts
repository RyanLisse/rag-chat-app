import type { Session } from 'next-auth';

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
