'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FileText, MessageSquare, Search, Upload } from 'lucide-react';

export function VectorStoreExample() {
  const steps = [
    {
      icon: <Upload className="h-5 w-5" />,
      title: 'Upload Documents',
      description:
        'Drop your PDFs, Word docs, or text files into the knowledge base',
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: 'Automatic Processing',
      description:
        'Documents are chunked and converted to embeddings automatically',
    },
    {
      icon: <Search className="h-5 w-5" />,
      title: 'Intelligent Search',
      description:
        'AI searches through your documents to find relevant information',
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: 'Cited Responses',
      description:
        'Get answers with numbered citations linking to source documents',
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>How the Knowledge Base Works</CardTitle>
        <CardDescription>
          Upload documents and get AI-powered answers with citations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {step.icon}
              </div>
              <div className="space-y-1">
                <h4 className="font-medium">{step.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
