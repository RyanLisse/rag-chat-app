// Unit Tests for lib/errors.ts
import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import {
  ChatSDKError,
  getMessageByErrorCode,
  visibilityBySurface,
  type ErrorCode,
  type ErrorType,
  type Surface,
} from '@/lib/errors';

describe('ChatSDKError', () => {
  it('should create error with correct properties', () => {
    const error = new ChatSDKError('unauthorized:auth', 'Invalid credentials');
    
    expect(error).toBeInstanceOf(Error);
    expect(error.type).toBe('unauthorized');
    expect(error.surface).toBe('auth');
    expect(error.statusCode).toBe(401);
    expect(error.cause).toBe('Invalid credentials');
    expect(error.message).toBe('You need to sign in before continuing.');
  });

  it('should handle all error type and surface combinations', () => {
    const errorTypes: ErrorType[] = ['bad_request', 'unauthorized', 'forbidden', 'not_found', 'rate_limit', 'offline'];
    const surfaces: Surface[] = ['chat', 'auth', 'api', 'stream', 'database', 'history', 'vote', 'document', 'suggestions'];

    errorTypes.forEach(type => {
      surfaces.forEach(surface => {
        const errorCode: ErrorCode = `${type}:${surface}`;
        const error = new ChatSDKError(errorCode);
        
        expect(error.type).toBe(type);
        expect(error.surface).toBe(surface);
        expect(error.message).toBeTruthy();
      });
    });
  });

  it('should set correct status codes for each error type', () => {
    const testCases: Array<[ErrorType, number]> = [
      ['bad_request', 400],
      ['unauthorized', 401],
      ['forbidden', 403],
      ['not_found', 404],
      ['rate_limit', 429],
      ['offline', 503],
    ];

    testCases.forEach(([type, expectedStatus]) => {
      const error = new ChatSDKError(`${type}:chat`);
      expect(error.statusCode).toBe(expectedStatus);
    });
  });

  describe('toResponse()', () => {
    let consoleErrorSpy: any;

    beforeEach(() => {
      consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should return full error details for response visibility', async () => {
      const error = new ChatSDKError('unauthorized:auth', 'Invalid token');
      const response = error.toResponse();

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body).toEqual({
        code: 'unauthorized:auth',
        message: 'You need to sign in before continuing.',
        cause: 'Invalid token',
      });
    });

    it('should log and return generic message for log visibility', async () => {
      const error = new ChatSDKError('bad_request:database', 'SQL syntax error');
      const response = error.toResponse();

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toEqual({
        code: '',
        message: 'Something went wrong. Please try again later.',
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith({
        code: 'bad_request:database',
        message: 'An error occurred while executing a database query.',
        cause: 'SQL syntax error',
      });
    });

    it('should handle errors without cause', async () => {
      const error = new ChatSDKError('not_found:chat');
      const response = error.toResponse();

      const body = await response.json();
      expect(body.cause).toBeUndefined();
      expect(body.message).toBe('The requested chat was not found. Please check the chat ID and try again.');
    });
  });
});

describe('getMessageByErrorCode', () => {
  it('should return correct messages for auth errors', () => {
    expect(getMessageByErrorCode('unauthorized:auth')).toBe('You need to sign in before continuing.');
    expect(getMessageByErrorCode('forbidden:auth')).toBe('Your account does not have access to this feature.');
  });

  it('should return correct messages for chat errors', () => {
    expect(getMessageByErrorCode('rate_limit:chat')).toBe('You have exceeded your maximum number of messages for the day. Please try again later.');
    expect(getMessageByErrorCode('not_found:chat')).toBe('The requested chat was not found. Please check the chat ID and try again.');
    expect(getMessageByErrorCode('forbidden:chat')).toBe('This chat belongs to another user. Please check the chat ID and try again.');
    expect(getMessageByErrorCode('unauthorized:chat')).toBe('You need to sign in to view this chat. Please sign in and try again.');
    expect(getMessageByErrorCode('offline:chat')).toBe("We're having trouble sending your message. Please check your internet connection and try again.");
  });

  it('should return correct messages for document errors', () => {
    expect(getMessageByErrorCode('not_found:document')).toBe('The requested document was not found. Please check the document ID and try again.');
    expect(getMessageByErrorCode('forbidden:document')).toBe('This document belongs to another user. Please check the document ID and try again.');
    expect(getMessageByErrorCode('unauthorized:document')).toBe('You need to sign in to view this document. Please sign in and try again.');
    expect(getMessageByErrorCode('bad_request:document')).toBe('The request to create or update the document was invalid. Please check your input and try again.');
  });

  it('should return correct message for API errors', () => {
    expect(getMessageByErrorCode('bad_request:api')).toBe("The request couldn't be processed. Please check your input and try again.");
  });

  it('should return generic database error message for any database error', () => {
    expect(getMessageByErrorCode('bad_request:database')).toBe('An error occurred while executing a database query.');
    expect(getMessageByErrorCode('unauthorized:database')).toBe('An error occurred while executing a database query.');
    expect(getMessageByErrorCode('not_found:database')).toBe('An error occurred while executing a database query.');
  });

  it('should return default message for unknown error codes', () => {
    expect(getMessageByErrorCode('unknown:surface' as ErrorCode)).toBe('Something went wrong. Please try again later.');
    expect(getMessageByErrorCode('bad_request:unknown' as ErrorCode)).toBe('Something went wrong. Please try again later.');
  });
});

describe('visibilityBySurface', () => {
  it('should have correct visibility for each surface', () => {
    expect(visibilityBySurface.database).toBe('log');
    expect(visibilityBySurface.chat).toBe('response');
    expect(visibilityBySurface.auth).toBe('response');
    expect(visibilityBySurface.stream).toBe('response');
    expect(visibilityBySurface.api).toBe('response');
    expect(visibilityBySurface.history).toBe('response');
    expect(visibilityBySurface.vote).toBe('response');
    expect(visibilityBySurface.document).toBe('response');
    expect(visibilityBySurface.suggestions).toBe('response');
  });

  it('should have all surfaces defined', () => {
    const surfaces: Surface[] = ['chat', 'auth', 'api', 'stream', 'database', 'history', 'vote', 'document', 'suggestions'];
    surfaces.forEach(surface => {
      expect(visibilityBySurface[surface]).toBeDefined();
      expect(['response', 'log', 'none']).toContain(visibilityBySurface[surface]);
    });
  });
});

describe('Error code format validation', () => {
  it('should handle malformed error codes gracefully', () => {
    // Test with missing separator
    const error1 = new ChatSDKError('unauthorized' as ErrorCode);
    expect(error1.type).toBe('unauthorized');
    expect(error1.surface).toBeUndefined();

    // Test with extra separators
    const error2 = new ChatSDKError('bad_request:auth:extra' as ErrorCode);
    expect(error2.type).toBe('bad_request');
    expect(error2.surface).toBe('auth:extra');

    // Test with empty parts
    const error3 = new ChatSDKError(':auth' as ErrorCode);
    expect(error3.type).toBe('');
    expect(error3.surface).toBe('auth');
  });
});

describe('Integration scenarios', () => {
  it('should handle typical authentication flow errors', () => {
    // User not logged in
    const authError = new ChatSDKError('unauthorized:auth');
    const response = authError.toResponse();
    expect(response.status).toBe(401);

    // User lacks permissions
    const forbiddenError = new ChatSDKError('forbidden:auth', 'User role: viewer');
    const forbiddenResponse = forbiddenError.toResponse();
    expect(forbiddenResponse.status).toBe(403);
  });

  it('should handle rate limiting scenarios', () => {
    const rateLimitError = new ChatSDKError('rate_limit:chat', 'User exceeded 100 messages per day');
    const response = rateLimitError.toResponse();
    expect(response.status).toBe(429);
  });

  it('should handle offline scenarios', () => {
    const offlineError = new ChatSDKError('offline:chat', 'Network unreachable');
    const response = offlineError.toResponse();
    expect(response.status).toBe(503);
  });
});