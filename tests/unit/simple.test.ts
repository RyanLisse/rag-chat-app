// Simple test to verify vitest setup
import { describe, it, expect } from 'vitest';

describe('Simple Tests', () => {
  it('should perform basic arithmetic', () => {
    expect(2 + 2).toBe(4);
    expect(5 * 3).toBe(15);
    expect(10 - 7).toBe(3);
  });

  it('should handle string operations', () => {
    expect('hello' + ' world').toBe('hello world');
    expect('test'.length).toBe(4);
    expect('TEST'.toLowerCase()).toBe('test');
  });

  it('should work with arrays', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr[0]).toBe(1);
    expect(arr.includes(2)).toBe(true);
  });

  it('should work with objects', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj.name).toBe('test');
    expect(obj.value).toBe(42);
    expect(Object.keys(obj)).toEqual(['name', 'value']);
  });
});