import type { Session } from 'next-auth';

interface UpdateDocumentProps {
  session: Session;
  dataStream: any; // TODO: Update type for AI SDK 5.0
}

// TODO: Reimplement updateDocument for AI SDK 5.0
// Tool execution signature has changed
export const updateDocument = ({ session, dataStream }: UpdateDocumentProps) =>
  undefined;
