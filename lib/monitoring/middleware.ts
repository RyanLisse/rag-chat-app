import { trace } from '@opentelemetry/api';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';
import { createRequestTracker, logger, ragMetrics } from './index';

// Create the request tracker
const requestTracker = createRequestTracker();

export async function withMonitoring(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || nanoid();
  const startTime = Date.now();

  // Add request ID to headers
  const headers = new Headers(request.headers);
  headers.set('x-request-id', requestId);

  // Create a new request with the updated headers
  const modifiedRequest = new NextRequest(request.url, {
    method: request.method,
    headers,
    body: request.body,
  });

  // Create request context
  const requestLogger = logger.child({ requestId });

  try {
    // Log request start
    requestLogger.info(
      `Request started: ${request.method} ${request.nextUrl.pathname}`,
      {
        method: request.method,
        path: request.nextUrl.pathname,
        userAgent: request.headers.get('user-agent'),
      }
    );

    // Execute the handler with tracking
    const response = await requestTracker(request, async () =>
      handler(modifiedRequest)
    );

    // Add request ID to response headers
    response.headers.set('x-request-id', requestId);

    const duration = Date.now() - startTime;

    // Log request completion
    requestLogger.info(
      `Request completed: ${request.method} ${request.nextUrl.pathname}`,
      {
        method: request.method,
        path: request.nextUrl.pathname,
        status: response.status,
        duration,
      }
    );

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log request error
    requestLogger.error(
      `Request failed: ${request.method} ${request.nextUrl.pathname}`,
      {
        method: request.method,
        path: request.nextUrl.pathname,
        duration,
      },
      error as Error
    );

    // Return error response
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        requestId,
      },
      {
        status: 500,
        headers: {
          'x-request-id': requestId,
        },
      }
    );
  }
}

// Middleware for API routes
export function apiRouteMiddleware(handler: Function) {
  return async (req: NextRequest, context?: any) => {
    return withMonitoring(req, () => handler(req, context));
  };
}

// Helper to extract user info from request
export function extractUserInfo(request: NextRequest): {
  userId?: string;
  sessionId?: string;
} {
  // Try to get user ID from various sources
  const authHeader = request.headers.get('authorization');
  const sessionCookie = request.cookies.get('session');

  return {
    userId: undefined, // This would be extracted from JWT or session
    sessionId: sessionCookie?.value,
  };
}

// Track chat-specific metrics
export function trackChatMetrics(
  event: string,
  metadata?: Record<string, any>
) {
  switch (event) {
    case 'message_sent':
      ragMetrics.chatMessageCount.add(1, { type: 'user', ...metadata });
      break;
    case 'message_received':
      ragMetrics.chatMessageCount.add(1, { type: 'assistant', ...metadata });
      break;
    case 'session_started':
      // Track session start time in metadata
      break;
    case 'session_ended':
      if (metadata?.duration) {
        ragMetrics.chatSessionDuration.record(metadata.duration);
      }
      break;
  }
}

// Create a span for long-running operations
export function createOperationSpan(
  name: string,
  attributes?: Record<string, any>
) {
  const span = trace.getTracer('rag-chat-app').startSpan(name, { attributes });
  return {
    span,
    end: (error?: Error) => {
      if (error) {
        span.recordException(error);
        span.setStatus({ code: 2, message: error.message });
      } else {
        span.setStatus({ code: 1 });
      }
      span.end();
    },
  };
}
