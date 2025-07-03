import { ChatExamples } from '@/components/chat-examples';
import { ChatFeatures } from '@/components/chat-features';
import { Button } from '@/components/ui/button';
import { VectorStoreExample } from '@/components/vector-store-example';
import { ArrowRight, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function ExamplesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              RAG Chat with{' '}
              <span className="text-primary">OpenAI Vector Store</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              A production-ready chat application with document retrieval,
              multi-model support, and comprehensive citation tracking.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Start Chatting
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">
                  Learn More
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Vector Store Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <VectorStoreExample />
      </section>

      {/* Examples Section */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <ChatExamples />
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <ChatFeatures />
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Upload your documents and start asking questions with AI-powered
            retrieval.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href="/">
              <MessageSquare className="mr-2 h-5 w-5" />
              Launch Chat Application
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
