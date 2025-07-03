import type { Session } from 'next-auth';

interface CreateDocumentProps {
  session: Session;
  dataStream: any; // TODO: Update type for AI SDK 5.0
}

// TODO: Reimplement createDocument for AI SDK 5.0
// Tool execution signature has changed
export const createDocument = ({ session, dataStream }: CreateDocumentProps) =>
  undefined;
