# OpenAI Vector Store Setup Guide

This guide will help you set up the OpenAI vector store functionality for the RAG chat application.

## Prerequisites

- OpenAI API key with access to the Assistants API
- Node.js/Bun installed
- Environment variables configured

## Environment Variables

Add the following to your `.env.local` file:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Optional: If you have an existing vector store
OPENAI_VECTORSTORE_ID=your-vector-store-id

# Optional: If you have an existing assistant
OPENAI_ASSISTANT_ID=your-assistant-id
```

## Features

### 1. File Upload and Management

- **Upload Documents**: Click the document icon in the chat header to open the Knowledge Base Manager
- **Supported Formats**: TXT, MD, CSV, PDF, JSON, Excel (.xlsx, .xls), Word (.docx, .doc)
- **File Management**: View uploaded files, check processing status, and delete files
- **Automatic Processing**: Files are automatically processed and indexed in the vector store

### 2. Automatic Document Search

**IMPORTANT**: The AI now automatically searches your vector store on EVERY message you send. This ensures:
- No relevant information is missed
- Complete transparency about information sources
- Consistent RAG (Retrieval Augmented Generation) behavior

The search happens automatically regardless of your message content.

### 3. Citations and Sources

When the AI finds relevant information in your documents:
- **Automatic Citation Artifacts**: Search results are ALWAYS displayed in a beautiful citation artifact
- **Inline Citations**: Numbered citations appear as superscript links [1], [2], etc.
- **Citation Details**: Hover over citations to see the source and quoted text
- **Source List**: A complete list of sources with metadata
- **Statistics**: View citation count, source distribution, and relevance scores

## Usage

### Uploading Documents

1. Click the document icon (📄) in the chat header
2. Drag and drop files or click "Select Files"
3. Wait for files to upload and process (you'll see status indicators)
4. Once processed, files are ready for search

### Automatic Search Behavior

The AI automatically searches your documents on EVERY message. You don't need to explicitly ask for document search. 

Examples of how this works:
- Ask any question → AI searches documents first → Shows results in citation artifact
- Make any statement → AI checks for relevant context → Provides citations if found
- Request general info → AI searches your docs before using general knowledge

**Note**: If no relevant documents are found, the AI will inform you and then provide information from general knowledge.

### Managing Citations

When the AI provides information from documents:
- Click on citation numbers to see details
- View the "Sources" section for all referenced documents
- Citation artifacts show detailed source information and statistics

## API Routes

The following API routes handle vector store operations:

- `POST /api/files/upload` - Upload files to vector store
- `POST /api/files/status` - Check file processing status
- `POST /api/files/list` - List all files in vector store
- `POST /api/files/delete` - Delete a file from vector store

## Troubleshooting

### Vector Store Not Created
If you don't have a vector store ID, the system will create one automatically on first use.

### Files Not Processing
- Check that your OpenAI API key has access to the Assistants API
- Ensure files are in supported formats
- Check file size limits (max 512MB per file)

### No Search Results
- Verify files have completed processing (status should be "completed")
- Try more specific search queries
- Check that the vector store ID is correctly configured

## Technical Details

### Vector Store Client
Location: `/lib/ai/vector-store.ts`
- Handles file uploads and vector store management
- Provides methods for file CRUD operations

### File Search Tool
Location: `/lib/ai/tools/file-search.ts`
- Integrates with OpenAI's file search capabilities
- Returns citations and sources
- Can create citation artifacts for complex results

### Components
- `FileUpload`: Drag-and-drop file upload component
- `FileManagerDialog`: Complete file management interface
- `CitationDisplay`: Shows inline citations in chat messages
- `CitationArtifact`: Full citation viewer with statistics

## Best Practices

1. **Organize Your Documents**: Use descriptive filenames
2. **Update Regularly**: Keep your knowledge base current
3. **Monitor Usage**: Check your OpenAI usage dashboard
4. **Clean Up**: Remove outdated files to maintain relevance

## Limitations

- Maximum file size: 512MB per file
- Supported file types are limited to text-based formats
- Processing time depends on file size and content
- Vector store has storage limits based on your OpenAI plan