import { tool } from 'ai';
import OpenAI from 'openai';
import { z } from 'zod';
import { generateUUID } from '@/lib/utils';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Image analysis tool using OpenAI's vision capabilities
 */
// TODO: Reimplement imageAnalysisTool for AI SDK 5.0
// Tool execution signature has changed
export const imageAnalysisTool = ({ dataStream }: { dataStream?: any } = {}) =>
  undefined;