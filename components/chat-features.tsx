'use client';

import { Brain, Code, FileSearch, Globe, Shield, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function ChatFeatures() {
  const features = [
    {
      icon: <Brain className="h-5 w-5" />,
      title: 'Multi-Model Support',
      description: 'Choose from GPT-4.1, Claude 4, Gemini 2.5, and more',
      badge: 'AI Models',
    },
    {
      icon: <FileSearch className="h-5 w-5" />,
      title: 'RAG with Citations',
      description: 'Get answers from your documents with source references',
      badge: 'Knowledge Base',
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: 'Real-time Streaming',
      description: "See responses as they're generated with smooth streaming",
      badge: 'Performance',
    },
    {
      icon: <Code className="h-5 w-5" />,
      title: 'Code & Artifacts',
      description: 'Generate and edit code with syntax highlighting',
      badge: 'Developer',
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: 'Secure Authentication',
      description: 'Guest access or full auth with NextAuth.js',
      badge: 'Security',
    },
    {
      icon: <Globe className="h-5 w-5" />,
      title: 'Edge-Ready Database',
      description: 'Powered by Turso for global low-latency access',
      badge: 'Infrastructure',
    },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Powerful Chat Features</h2>
        <p className="text-muted-foreground">
          Everything you need for production-ready AI conversations
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {feature.icon}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {feature.badge}
                </Badge>
              </div>
              <CardTitle className="mt-4 text-lg">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{feature.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
