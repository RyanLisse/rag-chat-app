# Shadcn-Dropzone Implementation

This document describes the implementation of shadcn-dropzone for file uploads in the RAG Chat application.

## Overview

The implementation replaces the previous file upload component with a modern dropzone interface that supports:
- Multiple file uploads
- Drag and drop functionality
- Upload progress tracking
- File type validation
- Visual status indicators
- File previews with appropriate icons

## Components

### 1. Dropzone UI Component (`components/ui/dropzone.tsx`)

The base dropzone component built on `react-dropzone-esm` with:
- Drag and drop area with visual feedback
- File type icons based on extension
- Progress bars for upload/processing
- Status badges (Pending, Uploading, Processing, Completed, Failed)
- Remove file functionality

### 2. File Upload Dropzone (`components/file-upload-dropzone.tsx`)

The upload handler component that:
- Manages file upload state
- Calls the vector store upload API
- Polls for processing status
- Provides callbacks for completion and errors

### 3. File Manager Dialog Integration

Updated `components/file-manager-dialog.tsx` to use the new dropzone component.

## Features

### Supported File Types
- Text files (.txt, .md)
- CSV files (.csv)
- PDF documents (.pdf)
- JSON files (.json)
- Excel files (.xls, .xlsx)
- Word documents (.doc, .docx)

### File Size Limit
- Maximum 512MB per file (OpenAI vector store limit)
- Maximum 10 files per upload batch

### Visual Feedback
- Drag hover state highlighting
- File type specific icons
- Color-coded status indicators
- Progress bars with percentage
- Error messages for failed uploads

### Upload Process
1. Files are validated client-side
2. Uploaded to `/api/files/upload` endpoint
3. Added to OpenAI vector store
4. Status polled every 2 seconds
5. UI updated with progress

## Usage

```tsx
import { FileUploadDropzone } from '@/components/file-upload-dropzone';

<FileUploadDropzone
  onUploadComplete={(files) => {
    console.log('Upload complete:', files);
  }}
  onError={(error) => {
    console.error('Upload error:', error);
  }}
  maxFileSize={512 * 1024 * 1024} // 512MB
  maxFiles={10}
/>
```

## API Integration

The dropzone integrates with:
- `/api/files/upload` - Handles file upload to OpenAI
- `/api/files/status` - Polls for processing status
- `/api/files/list` - Lists uploaded files
- `/api/files/delete` - Deletes files from vector store

## Testing

Test the implementation at `/test-dropzone` or through the File Manager dialog in the chat interface.