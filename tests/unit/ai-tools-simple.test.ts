// Simplified Unit Tests for AI Tools
import { describe, it, expect, vi } from 'vitest';
import { getWeather } from '@/lib/ai/tools/get-weather';

describe('getWeather Tool Basic Tests', () => {
  it('should have correct description', () => {
    expect(getWeather.description).toBe('Get the current weather at a location');
  });

  it('should have parameters defined', () => {
    expect(getWeather.parameters).toBeDefined();
    // parameters is a Zod schema, not a plain object
    expect(getWeather.parameters._def).toBeDefined();
    expect(getWeather.parameters._def.typeName).toBe('ZodObject');
  });

  it('should have execute function', () => {
    expect(getWeather.execute).toBeDefined();
    expect(typeof getWeather.execute).toBe('function');
  });
});