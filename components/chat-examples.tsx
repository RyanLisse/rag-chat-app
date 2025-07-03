'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MessageSquare, User } from 'lucide-react';

export function ChatExamples() {
  const examples = [
    {
      title: 'Document Analysis',
      messages: [
        {
          role: 'user',
          content:
            'Can you summarize the key features from my API documentation?',
        },
        {
          role: 'assistant',
          content:
            'Based on your uploaded API documentation, here are the key features:\n\n1. **RESTful API Design** with comprehensive endpoint coverage [1]\n2. **Authentication & Authorization** using JWT tokens and OAuth 2.0 [2]\n3. **Rate Limiting** with configurable limits per endpoint [3]\n4. **Real-time Updates** via WebSocket connections [4]\n5. **Comprehensive Error Handling** with detailed error codes [5]\n\nThe API supports both synchronous and asynchronous operations, with automatic retry mechanisms for failed requests.',
          citations: [
            'API Documentation v3.2, Overview',
            'Authentication Guide, Section 2',
            'Rate Limiting Policy',
            'WebSocket Implementation',
            'Error Handling Reference',
          ],
        },
      ],
    },
    {
      title: 'Code Generation',
      messages: [
        {
          role: 'user',
          content: 'Generate a Python example for the user authentication flow',
        },
        {
          role: 'assistant',
          content:
            'Based on your authentication documentation, here\'s a Python example:\n\n```python\nimport requests\nimport json\n\nclass APIClient:\n    def __init__(self, base_url, client_id, client_secret):\n        self.base_url = base_url\n        self.client_id = client_id\n        self.client_secret = client_secret\n        self.access_token = None\n    \n    def authenticate(self, username, password):\n        """Authenticate user and get access token [1]"""\n        auth_data = {\n            "grant_type": "password",\n            "username": username,\n            "password": password,\n            "client_id": self.client_id,\n            "client_secret": self.client_secret\n        }\n        \n        response = requests.post(f"{self.base_url}/auth/token", data=auth_data)\n        if response.status_code == 200:\n            self.access_token = response.json()["access_token"]\n            return True\n        return False\n```\n\nThis follows the OAuth 2.0 password grant flow as specified in your documentation [2].',
          citations: [
            'Authentication Flow Diagram',
            'OAuth 2.0 Implementation Guide',
          ],
        },
      ],
    },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">See It In Action</h2>
        <p className="text-muted-foreground">
          Examples of AI-powered conversations with document citations
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {examples.map((example, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="bg-muted/50 pb-3">
              <h3 className="font-semibold">{example.title}</h3>
            </CardHeader>
            <CardContent className="p-0">
              {example.messages.map((message, msgIndex) => (
                <div
                  key={msgIndex}
                  className={cn(
                    'border-b p-4 last:border-0',
                    message.role === 'user' ? 'bg-background' : 'bg-muted/20'
                  )}
                >
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      {message.role === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <MessageSquare className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium">
                        {message.role === 'user' ? 'You' : 'Assistant'}
                      </p>
                      <div className="prose prose-sm dark:prose-invert">
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {message.citations && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Sources:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {message.citations.map((citation, citIndex) => (
                              <span
                                key={citIndex}
                                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs"
                              >
                                <span className="font-medium">
                                  [{citIndex + 1}]
                                </span>
                                <span className="text-muted-foreground">
                                  {citation}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
