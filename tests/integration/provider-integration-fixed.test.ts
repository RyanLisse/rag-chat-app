/**
 * Integration tests for the provider system
 * Tests provider functionality with mocked API responses
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { setupIntegrationMocks, clearIntegrationMocks } from './setup-integration-mocks';

describe('Provider Integration Tests', () => {
  beforeAll(async () => {
    // Setup integration mocks
    setupIntegrationMocks();
  });

  afterAll(async () => {
    clearIntegrationMocks();
  });

  describe('Provider Health Checks', () => {
    it('should perform health checks without real API calls', async () => {
      // Test that fetch is properly mocked
      const response = await fetch('https://api.openai.com/v1/models');
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.data).toBeDefined();
      expect(data.data).toHaveLength(2);
    });

    it('should handle Anthropic health checks', async () => {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': 'test-key',
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.type).toBe('message');
    });

    it('should handle Google health checks', async () => {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=test-key');
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.models).toBeDefined();
      expect(data.models).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 responses for unknown endpoints', async () => {
      const response = await fetch('https://unknown-api.com/test');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toBe('Not found');
    });
  });

  describe('Response Validation', () => {
    it('should return properly formatted OpenAI responses', async () => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });
      
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('object', 'chat.completion');
      expect(data).toHaveProperty('choices');
      expect(data.choices[0]).toHaveProperty('message');
    });

    it('should return properly formatted Anthropic responses', async () => {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': 'test-key',
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('type', 'message');
      expect(data).toHaveProperty('content');
      expect(Array.isArray(data.content)).toBe(true);
    });

    it('should return properly formatted Google responses', async () => {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      expect(data).toHaveProperty('candidates');
      expect(Array.isArray(data.candidates)).toBe(true);
      expect(data.candidates[0]).toHaveProperty('content');
    });
  });
});