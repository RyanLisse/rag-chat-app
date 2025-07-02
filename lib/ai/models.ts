export const DEFAULT_CHAT_MODEL: string = 'gemini-2.5-flash';

export interface ModelCapabilities {
  streaming: boolean;
  functionCalling: boolean;
  vision: boolean;
  audioInput: boolean;
  audioOutput: boolean;
  documentSearch: boolean;
  thinking?: boolean;
}

export interface ThinkingBudget {
  maxTokens: number;
  enabled: boolean;
}

export const DEFAULT_THINKING_BUDGET: ThinkingBudget = {
  maxTokens: 8000,
  enabled: true,
};

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
  thinkingBudget?: ThinkingBudget;
}

export const chatModels: ChatModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most advanced multimodal flagship model (July 2025)',
    provider: 'openai',
    contextLength: 128000,
    maxOutputTokens: 16384,
    pricing: {
      inputPer1kTokens: 0.0025,
      outputPer1kTokens: 0.01,
      currency: 'USD',
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      audioInput: true,
      audioOutput: true,
      documentSearch: true,
    },
    tags: ['latest', 'recommended', 'multimodal'],
  },
  {
    id: 'gpt-4o-2025-07-01',
    name: 'GPT-4o (July 2025)',
    description: 'Latest GPT-4o with enhanced capabilities and 16K output',
    provider: 'openai',
    contextLength: 256000,
    maxOutputTokens: 16384,
    pricing: {
      inputPer1kTokens: 0.002,
      outputPer1kTokens: 0.008,
      currency: 'USD',
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      audioInput: true,
      audioOutput: true,
      documentSearch: true,
    },
    tags: ['latest', 'multimodal'],
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    description: 'Affordable small model for fast tasks with vision support (July 2025)',
    provider: 'openai',
    contextLength: 128000,
    maxOutputTokens: 16384,
    pricing: {
      inputPer1kTokens: 0.0001,
      outputPer1kTokens: 0.0004,
      currency: 'USD',
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      audioInput: true,
      audioOutput: false,
      documentSearch: true,
    },
    tags: ['fast', 'cost-effective', 'vision'],
  },
  {
    id: 'gpt-4o-mini-2025-07-01',
    name: 'GPT-4o mini (July 2025)',
    description: 'Affordable small model with improved performance',
    provider: 'openai',
    contextLength: 128000,
    maxOutputTokens: 16384,
    pricing: {
      inputPer1kTokens: 0.0001,
      outputPer1kTokens: 0.0003,
      currency: 'USD',
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      audioInput: true,
      audioOutput: false,
      documentSearch: true,
    },
    tags: ['fast', 'cost-effective'],
  },
  {
    id: 'o1',
    name: 'o1',
    description: 'Advanced reasoning model for complex problem-solving (July 2025)',
    provider: 'openai',
    contextLength: 200000,
    maxOutputTokens: 100000,
    pricing: {
      inputPer1kTokens: 0.01,
      outputPer1kTokens: 0.04,
      currency: 'USD',
    },
    capabilities: {
      streaming: false,
      functionCalling: false,
      vision: true,
      audioInput: false,
      audioOutput: false,
      documentSearch: true,
      thinking: true,
    },
    tags: ['reasoning', 'complex-tasks', 'latest'],
  },
  {
    id: 'o1-preview',
    name: 'o1-preview',
    description: 'Reasoning model preview (July 2025)',
    provider: 'openai',
    contextLength: 128000,
    maxOutputTokens: 32768,
    pricing: {
      inputPer1kTokens: 0.012,
      outputPer1kTokens: 0.048,
      currency: 'USD',
    },
    capabilities: {
      streaming: false,
      functionCalling: false,
      vision: true,
      audioInput: false,
      audioOutput: false,
      documentSearch: true,
      thinking: true,
    },
    tags: ['reasoning', 'preview'],
  },
  {
    id: 'o1-mini',
    name: 'o1-mini',
    description: 'Faster reasoning model for coding, math, and science (July 2025)',
    provider: 'openai',
    contextLength: 128000,
    maxOutputTokens: 65536,
    pricing: {
      inputPer1kTokens: 0.002,
      outputPer1kTokens: 0.008,
      currency: 'USD',
    },
    capabilities: {
      streaming: false,
      functionCalling: false,
      vision: false,
      audioInput: false,
      audioOutput: false,
      documentSearch: true,
      thinking: true,
    },
    tags: ['reasoning', 'fast', 'coding'],
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Legacy high-intelligence model (July 2025)',
    provider: 'openai',
    contextLength: 128000,
    maxOutputTokens: 4096,
    pricing: {
      inputPer1kTokens: 0.005,
      outputPer1kTokens: 0.015,
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
    tags: ['legacy'],
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'Legacy GPT-4 model',
    provider: 'openai',
    contextLength: 8192,
    maxOutputTokens: 8192,
    pricing: {
      inputPer1kTokens: 0.015,
      outputPer1kTokens: 0.03,
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
    tags: ['legacy'],
  },
  {
    id: 'claude-4',
    name: 'Claude 4',
    description: 'Advanced Anthropic model with strong reasoning (July 2025)',
    provider: 'anthropic',
    contextLength: 500000,
    maxOutputTokens: 8192,
    pricing: {
      inputPer1kTokens: 0.004,
      outputPer1kTokens: 0.012,
      currency: 'USD',
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      audioInput: false,
      audioOutput: false,
      documentSearch: true,
      thinking: true,
    },
    tags: ['long-context', 'recommended'],
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: "Google's most capable model with multimodal support (July 2025)",
    provider: 'google',
    contextLength: 2097152,
    maxOutputTokens: 8192,
    pricing: {
      inputPer1kTokens: 0.0035,
      outputPer1kTokens: 0.0105,
      currency: 'USD',
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      audioInput: true,
      audioOutput: true,
      documentSearch: true,
      thinking: true,
    },
    tags: ['multimodal', 'long-context'],
    thinkingBudget: {
      maxTokens: 10000,
      enabled: true,
    },
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast and efficient Google model (July 2025)',
    provider: 'google',
    contextLength: 1048576,
    maxOutputTokens: 8192,
    pricing: {
      inputPer1kTokens: 0.0005,
      outputPer1kTokens: 0.0015,
      currency: 'USD',
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      audioInput: true,
      audioOutput: false,
      documentSearch: true,
      thinking: true,
    },
    tags: ['fast', 'cost-effective', 'recommended'],
    thinkingBudget: {
      maxTokens: 8000,
      enabled: true,
    },
  },
];
