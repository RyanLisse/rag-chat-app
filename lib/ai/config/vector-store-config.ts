/**
 * Vector Store Configuration and Optimization Settings
 * 
 * This configuration ensures that the vector store is always queried
 * on every request for optimal RAG functionality.
 */

export const VECTOR_STORE_CONFIG = {
  // Enforce vector search on every request
  enforceSearch: true,
  
  // Always search first before any other action
  searchPriority: 'immediate' as const,
  
  // Minimum confidence threshold (0 = always search)
  minConfidenceThreshold: 0,
  
  // Search strategy
  searchStrategy: {
    // Always use the user's query
    useOriginalQuery: true,
    // Also generate alternative queries
    generateAlternatives: true,
    // Maximum number of search attempts
    maxAttempts: 3,
    // Timeout for each search (ms)
    searchTimeout: 10000,
  },
  
  // Result handling
  resultHandling: {
    // Always create citation artifacts
    alwaysCreateCitations: true,
    // Minimum results to consider successful
    minResultsThreshold: 0,
    // Include all results regardless of relevance
    includeAllResults: true,
  },
  
  // Logging and monitoring
  monitoring: {
    // Log every search request
    logAllSearches: true,
    // Track search performance
    trackPerformance: true,
    // Alert on search failures
    alertOnFailure: true,
  },
  
  // System prompts to enforce search
  prompts: {
    enforceSearch: "You MUST call fileSearch immediately before any response.",
    searchFirst: "Search the vector store FIRST, then formulate your response.",
    citeSources: "Always cite sources from the vector store when available.",
  },
};

/**
 * Helper to check if vector search should be enforced
 */
export function shouldEnforceVectorSearch(): boolean {
  return VECTOR_STORE_CONFIG.enforceSearch;
}

/**
 * Get search enforcement prompt
 */
export function getSearchEnforcementPrompt(): string {
  return Object.values(VECTOR_STORE_CONFIG.prompts).join(' ');
}