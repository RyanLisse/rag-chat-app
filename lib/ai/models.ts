export const DEFAULT_CHAT_MODEL: string = 'gpt-4.1';

export interface ModelCapabilities {
  streaming: boolean;
  functionCalling: boolean;
  vision: boolean;
  audioInput: boolean;
  audioOutput: boolean;
  documentSearch: boolean;
}

export interface ModelPricing {
  inputPer1kTokens: number;
  outputPer1kTokens: number;
  currency: string;
}

export interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider: 'openai' | 'anthropic' | 'google';
  contextLength: number;
  maxOutputTokens: number;
  pricing: ModelPricing;
  capabilities: ModelCapabilities;
  tags?: string[];
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: 'Most capable OpenAI model for complex tasks',
    provider: 'openai',
    contextLength: 128000,
    maxOutputTokens: 16384,
    pricing: {
      inputPer1kTokens: 0.01,
      outputPer1kTokens: 0.03,
      currency: 'USD',
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      audioInput: false,
      audioOutput: false,
      documentSearch: true,
    },
    tags: ['latest', 'recommended'],
  },
  {
    id: 'o4-mini',
    name: 'o4-mini',
    description: 'Fast and efficient OpenAI model with reasoning capabilities',
    provider: 'openai',
    contextLength: 128000,
    maxOutputTokens: 16384,
    pricing: {
      inputPer1kTokens: 0.002,
      outputPer1kTokens: 0.008,
      currency: 'USD',
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      audioInput: false,
      audioOutput: false,
      documentSearch: true,
    },
    tags: ['fast', 'reasoning'],
  },
  {
    id: 'claude-4',
    name: 'Claude 4',
    description: 'Advanced Anthropic model with strong reasoning',
    provider: 'anthropic',
    contextLength: 200000,
    maxOutputTokens: 4096,
    pricing: {
      inputPer1kTokens: 0.008,
      outputPer1kTokens: 0.024,
      currency: 'USD',
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      audioInput: false,
      audioOutput: false,
      documentSearch: false,
    },
    tags: ['long-context', 'recommended'],
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Google\'s most capable model with multimodal support',
    provider: 'google',
    contextLength: 2097152,
    maxOutputTokens: 8192,
    pricing: {
      inputPer1kTokens: 0.0125,
      outputPer1kTokens: 0.0375,
      currency: 'USD',
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      audioInput: true,
      audioOutput: true,
      documentSearch: false,
    },
    tags: ['multimodal', 'long-context'],
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast and efficient Google model',
    provider: 'google',
    contextLength: 1048576,
    maxOutputTokens: 8192,
    pricing: {
      inputPer1kTokens: 0.00125,
      outputPer1kTokens: 0.005,
      currency: 'USD',
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      audioInput: true,
      audioOutput: false,
      documentSearch: false,
    },
    tags: ['fast', 'cost-effective'],
  },
];
