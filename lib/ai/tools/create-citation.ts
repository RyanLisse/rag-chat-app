import { tool } from 'ai';
import { z } from 'zod';
import type { Citation, CitationSource } from '@/lib/types/citation';
import { generateUUID } from '@/lib/utils';

// TODO: Reimplement createCitationTool for AI SDK 5.0
// The tool definition format has changed significantly in AI SDK 5.0
export const createCitationTool = undefined;