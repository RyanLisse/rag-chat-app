<a href="https://github.com/RyanLisse/rag-chat-app">
  <img alt="Production-ready RAG Chat Application with citations." src="app/(chat)/opengraph-image.png">
  <h1 align="center">RAG Chat Application with OpenAI Vector Store</h1>
</a>

<p align="center">
    A production-ready RAG (Retrieval Augmented Generation) chat application built with Next.js, AI SDK, OpenAI Vector Store, and comprehensive citation support for document-based conversations.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#vector-store"><strong>Vector Store</strong></a> ·
  <a href="#examples"><strong>Examples</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- **RAG with OpenAI Vector Store**
  - Upload and process documents (PDF, TXT, DOCX, etc.)
  - Automatic document chunking and embedding generation
  - Semantic search across your knowledge base
  - Source citations with every response
  
- **Multi-Model Support**
  - GPT-4.1 (default)
  - GPT-4 and GPT-4 Turbo
  - Claude 4 (Anthropic)
  - Gemini 2.5 Pro/Flash (Google)
  - o4-mini with reasoning capabilities
  
- **Advanced Chat Interface**
  - Real-time streaming responses
  - Code syntax highlighting
  - Markdown support
  - File attachments
  - Chat history with search
  
- **Production-Ready Infrastructure**
  - [Next.js 15](https://nextjs.org) with App Router and Turbopack
  - [Turso DB](https://turso.tech) for edge-compatible SQLite database
  - [Auth.js](https://authjs.dev) for secure authentication
  - [Vercel Blob](https://vercel.com/storage/blob) for file storage
  - OpenTelemetry monitoring and observability
  
- **Developer Experience**
  - TypeScript throughout
  - Comprehensive test suite (unit, integration, E2E)
  - CI/CD with GitHub Actions
  - Docker support for containerized deployment

## Vector Store

The application integrates with OpenAI's Vector Store for advanced document retrieval:

### How It Works

1. **Document Upload**: Upload documents through the chat interface
2. **Processing**: Documents are automatically:
   - Chunked into optimal segments
   - Converted to embeddings using OpenAI's embedding models
   - Stored in the vector database
3. **Retrieval**: When you ask questions, the system:
   - Searches for relevant document chunks
   - Provides context to the AI model
   - Returns answers with source citations

### Supported File Types
- PDF documents
- Text files (.txt, .md)
- Word documents (.docx)
- Code files (.py, .js, .ts, etc.)
- CSV and JSON data files

### Configuration
Set your OpenAI Vector Store ID in the environment variables:
```env
OPENAI_VECTORSTORE_ID=vs_your_vector_store_id
```

## Examples

### Example 1: Technical Documentation Assistant
```
User: How do I calibrate the RoboRail system?