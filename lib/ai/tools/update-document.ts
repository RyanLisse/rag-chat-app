import { documentHandlersByArtifactKind } from '@/lib/artifacts/server';
import { getDocumentById } from '@/lib/db/queries';
import { tool } from 'ai';
import type { Session } from 'next-auth';
import { z } from 'zod';

interface UpdateDocumentProps {
  session: Session;
  dataStream: any; // TODO: Update type for AI SDK 5.0
}

// TODO: Reimplement updateDocument for AI SDK 5.0
// Tool execution signature has changed  
export const updateDocument = ({ session, dataStream }: UpdateDocumentProps) =>
  undefined;