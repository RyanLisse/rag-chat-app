'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MessageSquare, User } from 'lucide-react';

export function ChatExamples() {
  const examples = [
    {
      title: 'Technical Support',
      messages: [
        {
          role: 'user',
          content: 'How do I calibrate the RoboRail system?',
        },
        {
          role: 'assistant',
          content:
            'To calibrate the RoboRail system, follow these steps:\n\n1. **Power on the system** and ensure all sensors are connected [1]\n2. **Access the calibration menu** by pressing Menu > Settings > Calibration [2]\n3. **Run the auto-calibration sequence** which takes approximately 5 minutes [3]\n4. **Verify calibration** by checking the sensor readings match expected values [4]\n\nThe system will indicate successful calibration with a green LED. If calibration fails, check sensor connections and retry.',
          citations: [
            'RoboRail Manual v2.3, Page 45',
            'Quick Start Guide, Section 3',
            'Calibration Procedures, Step 2.1',
            'Troubleshooting Guide, Page 12',
          ],
        },
      ],
    },
    {
      title: 'Safety Procedures',
      messages: [
        {
          role: 'user',
          content: 'What are the safety procedures for RoboRail?',
        },
        {
          role: 'assistant',
          content:
            'Key safety procedures for RoboRail operations include:\n\n**Pre-Operation Safety:**\n- Emergency stop buttons must be tested daily [1]\n- Safety barriers should be in place before operation [2]\n- All operators must wear appropriate PPE [3]\n\n**During Operation:**\n- Maintain 2-meter safety zone around moving parts [4]\n- Monitor system status indicators continuously [5]\n- Never bypass safety interlocks [6]\n\n**Emergency Procedures:**\n- Press E-STOP for immediate shutdown\n- Follow lockout/tagout procedures for maintenance\n- Report all safety incidents immediately',
          citations: [
            'Safety Manual Ch. 1',
            'OSHA Guidelines',
            'PPE Requirements',
            'Operating Procedures 4.2',
            'System Monitoring Guide',
            'Safety Compliance Doc',
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
