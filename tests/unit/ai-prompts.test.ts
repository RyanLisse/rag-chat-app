// Unit Tests for lib/ai/prompts.ts
import { describe, it, expect } from 'vitest';
import {
  artifactsPrompt,
  regularPrompt,
  codePrompt,
  sheetPrompt,
  systemPrompt,
  getRequestPromptFromHints,
  updateDocumentPrompt,
  type RequestHints,
} from '@/lib/ai/prompts';
import type { ArtifactKind } from '@/components/artifact';

describe('Prompt Constants', () => {
  it('should have non-empty artifact prompt', () => {
    expect(artifactsPrompt).toBeTruthy();
    expect(artifactsPrompt).toContain('artifacts');
    expect(artifactsPrompt).toContain('createDocument');
    expect(artifactsPrompt).toContain('updateDocument');
  });

  it('should have regular prompt defined', () => {
    expect(regularPrompt).toBeTruthy();
    expect(regularPrompt).toContain('friendly assistant');
  });

  it('should have code prompt with Python instructions', () => {
    expect(codePrompt).toBeTruthy();
    expect(codePrompt).toContain('Python');
    expect(codePrompt).toContain('self-contained');
    expect(codePrompt).toContain('print()');
    expect(codePrompt).toContain('factorial');
  });

  it('should have sheet prompt for spreadsheet creation', () => {
    expect(sheetPrompt).toBeTruthy();
    expect(sheetPrompt).toContain('spreadsheet');
    expect(sheetPrompt).toContain('csv format');
  });
});

describe('getRequestPromptFromHints', () => {
  it('should format request hints correctly', () => {
    const hints: RequestHints = {
      latitude: 37.7749,
      longitude: -122.4194,
      city: 'San Francisco',
      country: 'United States',
    };

    const prompt = getRequestPromptFromHints(hints);
    
    expect(prompt).toContain('lat: 37.7749');
    expect(prompt).toContain('lon: -122.4194');
    expect(prompt).toContain('city: San Francisco');
    expect(prompt).toContain('country: United States');
    expect(prompt).toContain("About the origin of user's request:");
  });

  it('should handle null or undefined values', () => {
    const hints: RequestHints = {
      latitude: null as any,
      longitude: undefined as any,
      city: null as any,
      country: undefined as any,
    };

    const prompt = getRequestPromptFromHints(hints);
    
    expect(prompt).toContain('lat: null');
    expect(prompt).toContain('lon: undefined');
    expect(prompt).toContain('city: null');
    expect(prompt).toContain('country: undefined');
  });

  it('should handle numeric edge cases', () => {
    const hints: RequestHints = {
      latitude: 0,
      longitude: -180,
      city: '',
      country: '',
    };

    const prompt = getRequestPromptFromHints(hints);
    
    expect(prompt).toContain('lat: 0');
    expect(prompt).toContain('lon: -180');
    expect(prompt).toContain('city: ');
    expect(prompt).toContain('country: ');
  });
});

describe('systemPrompt', () => {
  const baseHints: RequestHints = {
    latitude: 40.7128,
    longitude: -74.0060,
    city: 'New York',
    country: 'United States',
  };

  it('should include only regular and request prompts for reasoning model', () => {
    const prompt = systemPrompt({
      selectedChatModel: 'chat-model-reasoning',
      requestHints: baseHints,
    });

    expect(prompt).toContain(regularPrompt);
    expect(prompt).toContain('lat: 40.7128');
    expect(prompt).toContain('city: New York');
    expect(prompt).not.toContain(artifactsPrompt);
  });

  it('should include artifacts prompt for non-reasoning models', () => {
    const models = ['gpt-4', 'claude-3', 'chat-model-standard', 'any-other-model'];

    models.forEach(model => {
      const prompt = systemPrompt({
        selectedChatModel: model,
        requestHints: baseHints,
      });

      expect(prompt).toContain(regularPrompt);
      expect(prompt).toContain('lat: 40.7128');
      expect(prompt).toContain(artifactsPrompt);
    });
  });

  it('should format prompts in correct order', () => {
    const prompt = systemPrompt({
      selectedChatModel: 'gpt-4',
      requestHints: baseHints,
    });

    const regularIndex = prompt.indexOf(regularPrompt);
    const requestIndex = prompt.indexOf('About the origin');
    const artifactsIndex = prompt.indexOf(artifactsPrompt.trim());

    expect(regularIndex).toBeLessThan(requestIndex);
    expect(requestIndex).toBeLessThan(artifactsIndex);
  });

  it('should handle empty request hints', () => {
    const emptyHints: RequestHints = {
      latitude: '' as any,
      longitude: '' as any,
      city: '',
      country: '',
    };

    const prompt = systemPrompt({
      selectedChatModel: 'gpt-4',
      requestHints: emptyHints,
    });

    expect(prompt).toBeTruthy();
    expect(prompt).toContain(regularPrompt);
  });
});

describe('updateDocumentPrompt', () => {
  const testContent = 'This is the current content of the document.';

  it('should generate text update prompt', () => {
    const prompt = updateDocumentPrompt(testContent, 'text');
    
    expect(prompt).toContain('Improve the following contents of the document');
    expect(prompt).toContain(testContent);
    expect(prompt).not.toContain('code');
    expect(prompt).not.toContain('spreadsheet');
  });

  it('should generate code update prompt', () => {
    const codeContent = 'def hello():\n    print("Hello, World!")';
    const prompt = updateDocumentPrompt(codeContent, 'code');
    
    expect(prompt).toContain('Improve the following code snippet');
    expect(prompt).toContain(codeContent);
    expect(prompt).not.toContain('document');
    expect(prompt).not.toContain('spreadsheet');
  });

  it('should generate sheet update prompt', () => {
    const sheetContent = 'Name,Age,City\nJohn,30,NYC\nJane,25,LA';
    const prompt = updateDocumentPrompt(sheetContent, 'sheet');
    
    expect(prompt).toContain('Improve the following spreadsheet');
    expect(prompt).toContain(sheetContent);
    expect(prompt).not.toContain('document');
    expect(prompt).not.toContain('code');
  });

  it('should handle null content', () => {
    const textPrompt = updateDocumentPrompt(null, 'text');
    const codePrompt = updateDocumentPrompt(null, 'code');
    const sheetPrompt = updateDocumentPrompt(null, 'sheet');
    
    expect(textPrompt).toContain('Improve the following contents');
    expect(textPrompt).toContain('null');
    expect(codePrompt).toContain('Improve the following code');
    expect(sheetPrompt).toContain('Improve the following spreadsheet');
  });

  it('should return empty string for unknown artifact types', () => {
    const unknownPrompt = updateDocumentPrompt(testContent, 'unknown' as ArtifactKind);
    expect(unknownPrompt).toBe('');
  });

  it('should handle empty content', () => {
    const prompt = updateDocumentPrompt('', 'text');
    expect(prompt).toContain('Improve the following contents');
    expect(prompt).toEndWith('\n\n\n');
  });

  it('should preserve content formatting', () => {
    const multilineContent = `Line 1
    Line 2 with indent
        Line 3 with more indent
    
    Line 5 after blank line`;
    
    const prompt = updateDocumentPrompt(multilineContent, 'code');
    expect(prompt).toContain(multilineContent);
  });

  it('should handle special characters in content', () => {
    const specialContent = 'Content with "quotes" and \'apostrophes\' and $pecial ch@rs!';
    const prompt = updateDocumentPrompt(specialContent, 'text');
    expect(prompt).toContain(specialContent);
  });
});

describe('Prompt Integration Tests', () => {
  it('should create consistent system prompts across multiple calls', () => {
    const hints: RequestHints = {
      latitude: 51.5074,
      longitude: -0.1278,
      city: 'London',
      country: 'United Kingdom',
    };

    const prompt1 = systemPrompt({ selectedChatModel: 'gpt-4', requestHints: hints });
    const prompt2 = systemPrompt({ selectedChatModel: 'gpt-4', requestHints: hints });

    expect(prompt1).toBe(prompt2);
  });

  it('should handle various real-world geographic locations', () => {
    const locations: RequestHints[] = [
      { latitude: -33.8688, longitude: 151.2093, city: 'Sydney', country: 'Australia' },
      { latitude: 35.6762, longitude: 139.6503, city: 'Tokyo', country: 'Japan' },
      { latitude: -23.5505, longitude: -46.6333, city: 'São Paulo', country: 'Brazil' },
      { latitude: 55.7558, longitude: 37.6173, city: 'Moscow', country: 'Russia' },
    ];

    locations.forEach(location => {
      const prompt = systemPrompt({ 
        selectedChatModel: 'claude-3', 
        requestHints: location 
      });
      
      expect(prompt).toContain(location.city);
      expect(prompt).toContain(location.country);
      expect(prompt).toContain(location.latitude.toString());
      expect(prompt).toContain(location.longitude.toString());
    });
  });
});