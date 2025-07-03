/**
 * Performance Test Setup
 * Optimized for accurate performance measurements
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Disable automatic garbage collection during performance tests
const originalGC = global.gc;

beforeAll(() => {
  // Force initial garbage collection
  if (global.gc) {
    global.gc();
  }
  
  // Set high-resolution timing
  process.env.NODE_ENV = 'test';
  
  // Disable automatic GC during tests for consistent timing
  if (originalGC) {
    // @ts-ignore
    global.gc = undefined;
  }
  
  console.log('🚀 Performance test environment initialized');
});

afterAll(() => {
  // Restore garbage collection
  if (originalGC) {
    global.gc = originalGC;
  }
  
  console.log('✅ Performance test environment cleaned up');
});

beforeEach(() => {
  // Clear any cached modules that might affect performance
  jest?.clearAllMocks?.();
  
  // Force garbage collection before each test for clean slate
  if (originalGC) {
    originalGC();
  }
});

afterEach(() => {
  // Clean up after performance test
  if (originalGC) {
    originalGC();
  }
});

// Performance testing utilities
export const performanceHelpers = {
  /**
   * Measure execution time with high precision
   */
  async measureTime<T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
    return { result, duration };
  },
  
  /**
   * Measure memory usage
   */
  measureMemory(): NodeJS.MemoryUsage {
    if (global.gc) {
      global.gc();
    }
    return process.memoryUsage();
  },
  
  /**
   * Run performance test multiple times and get statistics
   */
  async benchmark<T>(
    fn: () => Promise<T> | T,
    iterations = 10
  ): Promise<{
    results: T[];
    durations: number[];
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    medianDuration: number;
  }> {
    const results: T[] = [];
    const durations: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const { result, duration } = await this.measureTime(fn);
      results.push(result);
      durations.push(duration);
    }
    
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const medianDuration = sortedDurations[Math.floor(sortedDurations.length / 2)];
    
    return {
      results,
      durations,
      avgDuration,
      minDuration,
      maxDuration,
      medianDuration,
    };
  },
};