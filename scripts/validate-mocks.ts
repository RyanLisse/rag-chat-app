/**
 * Mock Infrastructure Validation Script
 * 
 * This script validates that the mock system is working correctly
 * and can identify potential conflicts before running tests.
 */

import { vi } from 'vitest';

// Mock validation results
interface MockValidationResult {
  mockName: string;
  isValid: boolean;
  error?: string;
  structure?: {
    hasExpectedMethods: boolean;
    methodCount: number;
    properties: string[];
  };
}

// Expected mock structures
const expectedMockStructures = {
  openai: {
    expectedMethods: ['files', 'vectorStores', 'models', 'beta'],
    mustHaveConstructor: true,
  },
  auth: {
    expectedMethods: ['auth'],
    mustHaveConstructor: false,
  },
  'ai-sdk': {
    expectedMethods: ['streamObject', 'streamText', 'convertToCoreMessages', 'tool'],
    mustHaveConstructor: false,
  },
  'vector-store': {
    expectedMethods: ['VectorStoreClient'],
    mustHaveConstructor: false,
  },
  logger: {
    expectedMethods: ['Logger', 'logger'],
    mustHaveConstructor: false,
  },
  'provider-utils': {
    expectedMethods: ['validateApiKey', 'retryWithBackoff', 'measureExecutionTime', 'CircuitBreaker'],
    mustHaveConstructor: false,
  },
};

/**
 * Validate a single mock structure
 */
function validateMockStructure(mockName: string, mock: any): MockValidationResult {
  const result: MockValidationResult = {
    mockName,
    isValid: false,
  };

  try {
    if (!mock) {
      result.error = 'Mock is undefined or null';
      return result;
    }

    const expectedStructure = expectedMockStructures[mockName as keyof typeof expectedMockStructures];
    if (!expectedStructure) {
      result.error = 'No expected structure defined for this mock';
      return result;
    }

    const properties = Object.keys(mock);
    result.structure = {
      hasExpectedMethods: true,
      methodCount: properties.length,
      properties,
    };

    // Check if expected methods exist
    for (const expectedMethod of expectedStructure.expectedMethods) {
      if (!(expectedMethod in mock)) {
        result.structure.hasExpectedMethods = false;
        result.error = `Missing expected method/property: ${expectedMethod}`;
        return result;
      }
    }

    // Special validation for OpenAI mock (needs constructor)
    if (mockName === 'openai' && expectedStructure.mustHaveConstructor) {
      if (!mock.default) {
        result.error = 'OpenAI mock missing default export (constructor)';
        return result;
      }

      try {
        const instance = new mock.default('test-key');
        for (const expectedMethod of expectedStructure.expectedMethods) {
          if (!(expectedMethod in instance)) {
            result.error = `OpenAI instance missing expected method: ${expectedMethod}`;
            return result;
          }
        }
      } catch (error) {
        result.error = `Failed to instantiate OpenAI mock: ${error}`;
        return result;
      }
    }

    // Special validation for VectorStore mock
    if (mockName === 'vector-store') {
      if (!mock.VectorStoreClient) {
        result.error = 'VectorStore mock missing VectorStoreClient';
        return result;
      }

      try {
        const client = new mock.VectorStoreClient('test-key');
        const expectedClientMethods = ['ensureVectorStore', 'uploadFile', 'uploadFiles', 'checkBatchStatus', 'checkFileStatus'];
        for (const method of expectedClientMethods) {
          if (!(method in client)) {
            result.error = `VectorStoreClient missing expected method: ${method}`;
            return result;
          }
        }
      } catch (error) {
        result.error = `Failed to instantiate VectorStoreClient: ${error}`;
        return result;
      }
    }

    result.isValid = true;
  } catch (error) {
    result.error = `Validation error: ${error}`;
  }

  return result;
}

/**
 * Main validation function
 */
export async function validateMockInfrastructure(): Promise<{
  allValid: boolean;
  results: MockValidationResult[];
  summary: string;
}> {
  const results: MockValidationResult[] = [];
  let validCount = 0;

  // Try to import the mock registry
  let mockRegistry: any;
  try {
    const mockModule = await import('../tests/setup/mock-factory');
    mockRegistry = mockModule.mockRegistry;
  } catch (error) {
    return {
      allValid: false,
      results: [{
        mockName: 'mock-registry',
        isValid: false,
        error: `Failed to import mock registry: ${error}`,
      }],
      summary: 'Critical error: Cannot import mock infrastructure',
    };
  }

  // Validate each expected mock
  for (const mockName of Object.keys(expectedMockStructures)) {
    const mock = mockRegistry.get(mockName);
    const result = validateMockStructure(mockName, mock);
    results.push(result);
    
    if (result.isValid) {
      validCount++;
    }
  }

  const allValid = validCount === Object.keys(expectedMockStructures).length;
  const summary = `Mock validation complete: ${validCount}/${Object.keys(expectedMockStructures).length} mocks valid`;

  return {
    allValid,
    results,
    summary,
  };
}

/**
 * Generate validation report
 */
export function generateValidationReport(validationResult: Awaited<ReturnType<typeof validateMockInfrastructure>>): string {
  const { allValid, results, summary } = validationResult;
  
  let report = `Mock Infrastructure Validation Report\n`;
  report += `==========================================\n\n`;
  report += `${summary}\n`;
  report += `Overall Status: ${allValid ? '✅ PASS' : '❌ FAIL'}\n\n`;

  for (const result of results) {
    report += `Mock: ${result.mockName}\n`;
    report += `Status: ${result.isValid ? '✅ Valid' : '❌ Invalid'}\n`;
    
    if (result.error) {
      report += `Error: ${result.error}\n`;
    }
    
    if (result.structure) {
      report += `Properties: ${result.structure.properties.join(', ')}\n`;
      report += `Method Count: ${result.structure.methodCount}\n`;
      report += `Has Expected Methods: ${result.structure.hasExpectedMethods ? '✅' : '❌'}\n`;
    }
    
    report += '\n';
  }

  if (!allValid) {
    report += `\n🔧 Recommendations:\n`;
    report += `- Check that all global mocks are properly defined\n`;
    report += `- Ensure mock factory functions return expected structures\n`;
    report += `- Verify no hoisting issues with vi.mock() calls\n`;
    report += `- Run tests with --reporter=verbose for detailed errors\n`;
  }

  return report;
}

// CLI execution
if (require.main === module) {
  validateMockInfrastructure()
    .then((result) => {
      const report = generateValidationReport(result);
      console.log(report);
      process.exit(result.allValid ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error during mock validation:', error);
      process.exit(1);
    });
}