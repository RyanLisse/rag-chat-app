'use client';

import { FileUploadDropzone } from '@/components/file-upload-dropzone';
import { toast } from 'sonner';

export default function TestDropzonePage() {
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Dropzone Test</h1>
      <p className="text-muted-foreground mb-8">
        Test the new shadcn-dropzone implementation with multiple file uploads,
        progress tracking, and file previews.
      </p>

      <FileUploadDropzone
        onUploadComplete={(files) => {
          console.log('Upload complete:', files);
          toast.success(`Uploaded ${files.length} files successfully!`);
        }}
        onError={(error) => {
          console.error('Upload error:', error);
          toast.error(error);
        }}
      />
    </div>
  );
}