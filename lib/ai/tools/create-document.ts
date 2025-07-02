import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from '@/lib/artifacts/server';
import { generateUUID } from '@/lib/utils';
import { tool } from 'ai';
import type { Session } from 'next-auth';
import { z } from 'zod';

interface CreateDocumentProps {
  session: Session;
  dataStream: any; // TODO: Update type for AI SDK 5.0
}

// TODO: Reimplement createDocument for AI SDK 5.0
// Tool execution signature has changed
export const createDocument = ({ session, dataStream }: CreateDocumentProps) =>
  undefined;
