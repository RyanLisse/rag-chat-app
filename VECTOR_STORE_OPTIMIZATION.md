# Vector Store Optimization Guide

This document outlines the optimizations implemented to ensure the vector store is always queried on every request.

## Key Optimizations

### 1. System Prompt Prioritization
- The `fileSearchPrompt` is now placed FIRST in the system prompt
- Enforces immediate vector search before any other action
- Clear instructions that this is non-negotiable

### 2. Message Injection Middleware
- `enforceVectorSearch()` - Checks messages and injects enforcement directives
- `injectFileSearchDirective()` - Adds immediate action directives after user messages
- Ensures the model cannot skip vector search

### 3. Tool Priority Configuration
- `fileSearch` is now the FIRST tool in the tools list
- Available even for reasoning models
- Wrapped with logging to track every call

### 4. Vector Store Configuration
- Centralized configuration in `lib/ai/config/vector-store-config.ts`
- Enforces search on every request
- Zero confidence threshold (always search)

### 5. Monitoring and Logging
- Comprehensive logging of all vector searches
- Real-time monitoring endpoint at `/api/vector-store/monitor`
- Visual monitor component available
- Tracks success rate, response times, and queries

## Configuration

### Environment Variables
```bash
OPENAI_VECTORSTORE_ID=vs_your_id_here  # Required
OPENAI_ASSISTANT_ID=asst_your_id_here  # Optional
```

### Key Files Modified

1. **lib/ai/prompts.ts**
   - Enhanced file search prompt with strict enforcement
   - System prompt always starts with vector search requirements

2. **lib/ai/tools/file-search.ts**
   - Added comprehensive logging
   - Performance monitoring
   - Enhanced error handling

3. **app/(chat)/api/chat/route.ts**
   - Message injection middleware
   - Tool wrapping for logging
   - Increased max steps for search completion

4. **New Files Created**
   - `lib/ai/middleware/enforce-vector-search.ts`
   - `lib/ai/tools/force-file-search.ts`
   - `lib/ai/config/vector-store-config.ts`
   - `components/vector-store-monitor.tsx`
   - `app/(chat)/api/vector-store/monitor/route.ts`

## How It Works

1. **User sends a message**
2. **Middleware injection** - System messages are injected to enforce search
3. **System prompt** - Model receives strict instructions to search first
4. **Tool execution** - fileSearch is called immediately
5. **Monitoring** - All searches are logged and tracked
6. **Response** - Only after search results are retrieved

## Monitoring

Access the monitoring dashboard by adding the `<VectorStoreMonitor />` component to your layout:

```tsx
import { VectorStoreMonitor } from '@/components/vector-store-monitor';

// In your layout or page
<VectorStoreMonitor />
```

## Verification

To verify vector search is working on every request:

1. Check console logs for "🎯 FILE SEARCH TOOL CALLED!"
2. Monitor the `/api/vector-store/monitor` endpoint
3. Look for "=== VECTOR STORE SEARCH INITIATED ===" in logs
4. Verify citation artifacts are created for search results

## Troubleshooting

If vector search is not being called:

1. Ensure `OPENAI_VECTORSTORE_ID` is set correctly
2. Check that the vector store has uploaded documents
3. Verify the assistant has file_search tool enabled
4. Check console for any error messages
5. Ensure message injection middleware is active

## Best Practices

1. **Always have documents in your vector store** - Empty stores will return no results
2. **Monitor search performance** - Use the monitoring tools to track effectiveness
3. **Review search queries** - Ensure they match your document content
4. **Update system prompts** - Adjust based on your specific use case

## Future Enhancements

- [ ] Implement query expansion for better search coverage
- [ ] Add relevance scoring adjustments
- [ ] Create search analytics dashboard
- [ ] Implement search result caching
- [ ] Add A/B testing for search strategies