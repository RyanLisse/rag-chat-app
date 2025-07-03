import { vi, beforeEach, afterEach } from 'vitest';
import { mockRegistry } from './mock-factory';

/**
 * Test isolation utilities to prevent mock conflicts between test suites
 */

export interface TestIsolationConfig {
  resetMocks?: boolean;
  clearMocks?: boolean;
  restoreMocks?: boolean;
  isolateModules?: boolean;
}

/**
 * Creates an isolated test environment for a specific test suite
 */
export function createTestIsolation(config: TestIsolationConfig = {}) {
  const {
    resetMocks = true,
    clearMocks = true,
    restoreMocks = false,
    isolateModules = false
  } = config;

  return {
    setup: () => {
      if (isolateModules) {
        vi.resetModules();
      }
      if (resetMocks) {
        mockRegistry.reset();
      }
      if (clearMocks) {
        vi.clearAllMocks();
      }
    },
    
    cleanup: () => {
      if (restoreMocks) {
        vi.restoreAllMocks();
      } else if (clearMocks) {
        vi.clearAllMocks();
      }
    },
    
    /**
     * Temporarily override a specific mock for this test
     */
    withMock: <T>(mockKey: string, mockImplementation: T, testFn: () => Promise<void> | void) => {
      const originalMock = mockRegistry.get(mockKey);
      try {
        mockRegistry.register(mockKey, () => mockImplementation);
        return testFn();
      } finally {
        if (originalMock) {
          mockRegistry.register(mockKey, () => originalMock);
        }
      }
    }
  };
}

/**
 * Higher-order function to wrap test suites with isolation
 */
export function withTestIsolation(config: TestIsolationConfig = {}) {
  return function(testSuiteFn: () => void) {
    const isolation = createTestIsolation(config);
    
    // Return a wrapper that can be called within describe blocks
    return () => {
      beforeEach(() => {
        isolation.setup();
      });
      
      afterEach(() => {
        isolation.cleanup();
      });
      
      return testSuiteFn();
    };
  };
}

/**
 * Mock state management utilities
 */
export class MockStateManager {
  private snapshots: Map<string, any> = new Map();
  
  /**
   * Save current state of all mocks
   */
  saveSnapshot(snapshotName: string = 'default'): void {
    const currentState = new Map();
    // Capture all current mock implementations
    for (const [key, mock] of (mockRegistry as any).mocks.entries()) {
      if (mock && typeof mock === 'object') {
        // Create a deep copy of the mock state
        currentState.set(key, JSON.parse(JSON.stringify(mock)));
      }
    }
    this.snapshots.set(snapshotName, currentState);
  }
  
  /**
   * Restore saved state
   */
  restoreSnapshot(snapshotName: string = 'default'): void {
    const snapshot = this.snapshots.get(snapshotName);
    if (snapshot) {
      // Restore the saved state
      for (const [key, state] of snapshot.entries()) {
        mockRegistry.register(key, () => state);
      }
    }
  }
  
  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots.clear();
  }
}

/**
 * Global mock state manager instance
 */
export const mockStateManager = new MockStateManager();

/**
 * Mock conflict detection utilities
 */
export class MockConflictDetector {
  private registrations: Map<string, string[]> = new Map();
  
  /**
   * Register a mock usage by a test file
   */
  register(mockPath: string, testFile: string): void {
    if (!this.registrations.has(mockPath)) {
      this.registrations.set(mockPath, []);
    }
    this.registrations.get(mockPath)!.push(testFile);
  }
  
  /**
   * Detect potential conflicts
   */
  detectConflicts(): Array<{ mockPath: string; conflicts: string[] }> {
    const conflicts: Array<{ mockPath: string; conflicts: string[] }> = [];
    
    for (const [mockPath, testFiles] of this.registrations.entries()) {
      if (testFiles.length > 1) {
        conflicts.push({
          mockPath,
          conflicts: testFiles
        });
      }
    }
    
    return conflicts;
  }
  
  /**
   * Clear all registrations
   */
  clear(): void {
    this.registrations.clear();
  }
  
  /**
   * Generate conflict report
   */
  generateReport(): string {
    const conflicts = this.detectConflicts();
    
    if (conflicts.length === 0) {
      return 'No mock conflicts detected.';
    }
    
    let report = 'Mock Conflicts Detected:\n\n';
    
    for (const { mockPath, conflicts: testFiles } of conflicts) {
      report += `Mock: ${mockPath}\n`;
      report += `Used by: ${testFiles.join(', ')}\n`;
      report += 'Recommendation: Use shared mock from global setup or isolate test-specific mocks\n\n';
    }
    
    return report;
  }
}

/**
 * Global conflict detector instance
 */
export const mockConflictDetector = new MockConflictDetector();

/**
 * Test-specific mock overrides
 */
export interface MockOverride {
  mockPath: string;
  implementation: any;
  testPattern?: string | RegExp;
}

export class TestSpecificMockManager {
  private overrides: MockOverride[] = [];
  
  /**
   * Register a test-specific mock override
   */
  addOverride(override: MockOverride): void {
    this.overrides.push(override);
  }
  
  /**
   * Apply overrides for a specific test
   */
  applyOverrides(testPath: string): void {
    for (const override of this.overrides) {
      if (this.shouldApplyOverride(override, testPath)) {
        mockRegistry.register(override.mockPath, () => override.implementation);
      }
    }
  }
  
  private shouldApplyOverride(override: MockOverride, testPath: string): boolean {
    if (!override.testPattern) {
      return true;
    }
    
    if (typeof override.testPattern === 'string') {
      return testPath.includes(override.testPattern);
    }
    
    return override.testPattern.test(testPath);
  }
  
  /**
   * Clear all overrides
   */
  clearOverrides(): void {
    this.overrides = [];
  }
}

/**
 * Global test-specific mock manager
 */
export const testSpecificMockManager = new TestSpecificMockManager();