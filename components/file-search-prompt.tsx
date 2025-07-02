'use client';

import { Search, FileText, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { UIMessage } from 'ai';
import { motion } from 'framer-motion';

interface FileSearchPromptProps {
  append: (message: UIMessage) => void; // TODO: Fix for AI SDK 5.0
}

export function FileSearchPrompt({ append }: FileSearchPromptProps) {
  const handleSearch = (query: string) => {
    append({
      id: `file-search-${Date.now()}`,
      role: 'user',
      parts: [{ type: 'text', text: query }], // Updated for AI SDK 5.0
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto mb-4"
    >
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Search Your Knowledge Base</h3>
            <p className="text-sm text-muted-foreground">
              Powered by RAG - Search through your uploaded documents
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="justify-start text-left h-auto py-3 px-4 hover:bg-white dark:hover:bg-gray-900"
            onClick={() => handleSearch('Search my documents for relevant information')}
          >
            <Search className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="text-sm">Search all documents</span>
          </Button>
          
          <Button
            variant="outline"
            className="justify-start text-left h-auto py-3 px-4 hover:bg-white dark:hover:bg-gray-900"
            onClick={() => handleSearch('What documents do I have uploaded?')}
          >
            <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="text-sm">List my documents</span>
          </Button>
          
          <Button
            variant="outline"
            className="justify-start text-left h-auto py-3 px-4 hover:bg-white dark:hover:bg-gray-900"
            onClick={() => handleSearch('Summarize the key points from my documents')}
          >
            <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="text-sm">Summarize key points</span>
          </Button>
          
          <Button
            variant="outline"
            className="justify-start text-left h-auto py-3 px-4 hover:bg-white dark:hover:bg-gray-900"
            onClick={() => handleSearch('Find specific information in my knowledge base')}
          >
            <Search className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="text-sm">Find specific info</span>
          </Button>
        </div>
        
        <div className="mt-4 text-xs text-muted-foreground">
          <p>💡 Tip: The AI will automatically search your documents and show citations when relevant!</p>
        </div>
      </Card>
    </motion.div>
  );
}