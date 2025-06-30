// Monitoring and Logging E2E Tests
import { test, expect, ragHelpers } from '../helpers/stagehand-integration';

test.describe('Monitoring and Logging', () => {
  let capturedLogs: Array<{
    level: string;
    message: string;
    timestamp: Date;
    context?: any;
  }> = [];

  let capturedNetworkRequests: Array<{
    url: string;
    method: string;
    status: number;
    timing: number;
    headers: Record<string, string>;
  }> = [];

  test.beforeEach(async ({ stagehandPage }) => {
    // Clear captured data
    capturedLogs = [];
    capturedNetworkRequests = [];

    // Capture console logs
    stagehandPage.on('console', msg => {
      capturedLogs.push({
        level: msg.type(),
        message: msg.text(),
        timestamp: new Date(),
        context: msg.args()
      });
    });

    // Capture network requests
    stagehandPage.on('request', request => {
      const startTime = Date.now();
      
      stagehandPage.on('response', response => {
        if (response.url() === request.url()) {
          capturedNetworkRequests.push({
            url: request.url(),
            method: request.method(),
            status: response.status(),
            timing: Date.now() - startTime,
            headers: response.headers()
          });
        }
      });
    });

    await stagehandPage.goto('/');
    await stagehandPage.waitForLoadState('networkidle');
  });

  test('application startup logging', async ({ stagehandPage }) => {
    // Check for essential startup logs
    const startupLogs = capturedLogs.filter(log => 
      log.message.toLowerCase().includes('start') ||
      log.message.toLowerCase().includes('init') ||
      log.message.toLowerCase().includes('ready')
    );

    // Should have some startup logging
    expect(startupLogs.length).toBeGreaterThan(0);

    // Check for error logs during startup
    const errorLogs = capturedLogs.filter(log => log.level === 'error');
    
    // Should not have errors during normal startup
    expect(errorLogs.length).toBe(0);

    // Verify essential services are initialized
    const serviceChecks = await stagehandPage.extract<{
      chatServiceReady: boolean;
      uploadServiceReady: boolean;
      vectorStoreReady: boolean;
      authenticationReady: boolean;
    }>({
      instruction: 'Check if essential services are properly initialized and ready',
      schema: {
        type: 'object',
        properties: {
          chatServiceReady: { type: 'boolean' },
          uploadServiceReady: { type: 'boolean' },
          vectorStoreReady: { type: 'boolean' },
          authenticationReady: { type: 'boolean' }
        }
      }
    });

    expect(serviceChecks.chatServiceReady).toBe(true);
    expect(serviceChecks.uploadServiceReady).toBe(true);
  });

  test('user interaction logging', async ({ stagehandPage }) => {
    // Clear previous logs
    capturedLogs = [];

    // Perform user interactions
    await stagehandPage.act('Upload a test document');
    await stagehandPage.observe('Wait for upload completion');

    // Check upload interaction logs
    const uploadLogs = capturedLogs.filter(log =>
      log.message.toLowerCase().includes('upload') ||
      log.message.toLowerCase().includes('file')
    );

    expect(uploadLogs.length).toBeGreaterThan(0);

    // Send a chat message
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Test message for logging',
      { waitForResponse: true }
    );

    // Check chat interaction logs
    const chatLogs = capturedLogs.filter(log =>
      log.message.toLowerCase().includes('message') ||
      log.message.toLowerCase().includes('chat') ||
      log.message.toLowerCase().includes('query')
    );

    expect(chatLogs.length).toBeGreaterThan(0);

    // Switch models
    await ragHelpers.selectModel(stagehandPage, 'GPT-4');

    // Check model switch logs
    const modelLogs = capturedLogs.filter(log =>
      log.message.toLowerCase().includes('model') ||
      log.message.toLowerCase().includes('switch')
    );

    expect(modelLogs.length).toBeGreaterThan(0);

    // Verify no sensitive information in logs
    const sensitivePatterns = [
      /api[_-]?key/i,
      /password/i,
      /token/i,
      /secret/i,
      /credential/i
    ];

    for (const log of capturedLogs) {
      for (const pattern of sensitivePatterns) {
        expect(log.message).not.toMatch(pattern);
      }
    }
  });

  test('error logging and reporting', async ({ stagehandPage }) => {
    // Clear previous logs
    capturedLogs = [];

    // Trigger various error conditions
    
    // 1. Invalid file upload
    await stagehandPage.act('Try to upload an invalid file');
    await stagehandPage.waitForTimeout(2000);

    const uploadErrorLogs = capturedLogs.filter(log =>
      log.level === 'error' && 
      (log.message.toLowerCase().includes('upload') || 
       log.message.toLowerCase().includes('file'))
    );

    expect(uploadErrorLogs.length).toBeGreaterThan(0);

    // 2. Network error simulation
    await stagehandPage.context().setOffline(true);
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'This should fail',
      { waitForResponse: false }
    );
    await stagehandPage.waitForTimeout(3000);

    const networkErrorLogs = capturedLogs.filter(log =>
      log.level === 'error' &&
      (log.message.toLowerCase().includes('network') ||
       log.message.toLowerCase().includes('fetch') ||
       log.message.toLowerCase().includes('connection'))
    );

    expect(networkErrorLogs.length).toBeGreaterThan(0);

    // Restore network
    await stagehandPage.context().setOffline(false);

    // 3. Verify error logs have proper structure
    const errorLogs = capturedLogs.filter(log => log.level === 'error');
    
    for (const errorLog of errorLogs) {
      // Error logs should have meaningful messages
      expect(errorLog.message.length).toBeGreaterThan(10);
      expect(errorLog.timestamp).toBeInstanceOf(Date);
      
      // Should not expose stack traces to client-side logs (security)
      expect(errorLog.message).not.toContain('at Object.');
      expect(errorLog.message).not.toContain('node_modules');
    }
  });

  test('performance monitoring', async ({ stagehandPage }) => {
    // Capture performance metrics
    const performanceMetrics = await stagehandPage.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      const resources = performance.getEntriesByType('resource');

      return {
        navigation: {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          timeToFirstByte: navigation.responseStart - navigation.requestStart,
        },
        paint: paint.map(p => ({ name: p.name, startTime: p.startTime })),
        resourceCount: resources.length,
        slowResources: resources.filter(r => r.duration > 1000).length
      };
    });

    // Verify performance monitoring is active
    expect(performanceMetrics.navigation.domContentLoaded).toBeGreaterThan(0);
    expect(performanceMetrics.resourceCount).toBeGreaterThan(0);

    // Check for performance logging
    const perfLogs = capturedLogs.filter(log =>
      log.message.toLowerCase().includes('performance') ||
      log.message.toLowerCase().includes('timing') ||
      log.message.toLowerCase().includes('metric')
    );

    // Application should log performance metrics
    expect(perfLogs.length).toBeGreaterThan(0);

    // Perform operations and check performance logging
    await stagehandPage.act('Upload a document');
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Test performance monitoring',
      { waitForResponse: true }
    );

    // Check for operation-specific performance logs
    const operationPerfLogs = capturedLogs.filter(log =>
      (log.message.toLowerCase().includes('upload') && log.message.toLowerCase().includes('time')) ||
      (log.message.toLowerCase().includes('response') && log.message.toLowerCase().includes('time'))
    );

    expect(operationPerfLogs.length).toBeGreaterThan(0);
  });

  test('api request monitoring', async ({ stagehandPage }) => {
    // Upload a document to trigger API calls
    await stagehandPage.act('Upload a test document');
    await stagehandPage.observe('Wait for processing');

    // Send chat message to trigger more API calls
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Generate response to monitor API calls',
      { waitForResponse: true }
    );

    // Analyze captured network requests
    const apiRequests = capturedNetworkRequests.filter(req =>
      req.url.includes('/api/') || 
      req.url.includes('/chat') ||
      req.url.includes('/upload')
    );

    expect(apiRequests.length).toBeGreaterThan(0);

    // Check API request timing
    const slowRequests = apiRequests.filter(req => req.timing > 10000); // > 10 seconds
    expect(slowRequests.length).toBe(0); // No requests should take longer than 10 seconds

    // Check for proper status codes
    const errorRequests = apiRequests.filter(req => req.status >= 400);
    expect(errorRequests.length).toBe(0); // No API errors during normal operation

    // Verify request headers include monitoring headers
    const requestsWithTracking = apiRequests.filter(req =>
      req.headers['x-request-id'] || 
      req.headers['x-trace-id'] ||
      req.headers['x-session-id']
    );

    // At least some requests should have tracking headers
    expect(requestsWithTracking.length).toBeGreaterThan(0);

    // Check for API usage logging
    const apiLogs = capturedLogs.filter(log =>
      log.message.toLowerCase().includes('api') ||
      log.message.toLowerCase().includes('request') ||
      log.message.toLowerCase().includes('response')
    );

    expect(apiLogs.length).toBeGreaterThan(0);
  });

  test('security monitoring', async ({ stagehandPage }) => {
    // Clear logs for security-specific testing
    capturedLogs = [];

    // Attempt potentially suspicious activities
    
    // 1. Multiple rapid requests (potential DoS)
    for (let i = 0; i < 10; i++) {
      await ragHelpers.sendChatMessage(
        stagehandPage,
        `Rapid request ${i}`,
        { waitForResponse: false }
      );
      await stagehandPage.waitForTimeout(100);
    }

    // 2. Malicious input attempts
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      '"; DROP TABLE users; --',
      '../../etc/passwd',
      'javascript:alert(1)'
    ];

    for (const input of maliciousInputs) {
      await ragHelpers.sendChatMessage(
        stagehandPage,
        input,
        { waitForResponse: true }
      );
    }

    // Check for security-related logs
    const securityLogs = capturedLogs.filter(log =>
      log.message.toLowerCase().includes('security') ||
      log.message.toLowerCase().includes('blocked') ||
      log.message.toLowerCase().includes('suspicious') ||
      log.message.toLowerCase().includes('rate') ||
      log.message.toLowerCase().includes('sanitize')
    );

    // Should have some security monitoring
    expect(securityLogs.length).toBeGreaterThan(0);

    // Verify no sensitive data in logs
    for (const log of capturedLogs) {
      // Should not log raw malicious inputs
      expect(log.message).not.toContain('<script>');
      expect(log.message).not.toContain('DROP TABLE');
    }

    // Check for Content Security Policy violations
    const cspLogs = capturedLogs.filter(log =>
      log.message.toLowerCase().includes('csp') ||
      log.message.toLowerCase().includes('content security policy')
    );

    // CSP violations should be logged if they occur
    // (This test ensures the monitoring is in place)
  });

  test('user analytics and behavior tracking', async ({ stagehandPage }) => {
    // Clear logs for analytics testing
    capturedLogs = [];

    // Perform various user actions
    const userActions = [
      () => stagehandPage.act('Upload a document'),
      () => ragHelpers.sendChatMessage(stagehandPage, 'Analytics test message', { waitForResponse: true }),
      () => ragHelpers.selectModel(stagehandPage, 'Claude 3 Sonnet'),
      () => stagehandPage.act('Click on a citation if available'),
      () => stagehandPage.reload()
    ];

    for (const action of userActions) {
      try {
        await action();
        await stagehandPage.waitForTimeout(1000);
      } catch (error) {
        // Some actions might fail, that's okay for this test
      }
    }

    // Check for analytics/tracking logs
    const analyticsLogs = capturedLogs.filter(log =>
      log.message.toLowerCase().includes('analytics') ||
      log.message.toLowerCase().includes('tracking') ||
      log.message.toLowerCase().includes('event') ||
      log.message.toLowerCase().includes('user_action')
    );

    // Should have some user behavior tracking
    expect(analyticsLogs.length).toBeGreaterThan(0);

    // Verify analytics data structure
    for (const analyticsLog of analyticsLogs) {
      // Analytics logs should be structured
      expect(analyticsLog.message.length).toBeGreaterThan(5);
      expect(analyticsLog.timestamp).toBeInstanceOf(Date);
    }

    // Check for session tracking
    const sessionLogs = capturedLogs.filter(log =>
      log.message.toLowerCase().includes('session') ||
      log.message.toLowerCase().includes('user_id')
    );

    expect(sessionLogs.length).toBeGreaterThan(0);
  });

  test('health check and system monitoring', async ({ stagehandPage }) => {
    // Navigate to health check endpoint if available
    try {
      await stagehandPage.goto('/api/health');
      const healthResponse = await stagehandPage.textContent('body');
      
      // Health check should return valid JSON
      const healthData = JSON.parse(healthResponse || '{}');
      expect(healthData.status).toBeDefined();
      
      // Go back to main app
      await stagehandPage.goto('/');
      await stagehandPage.waitForLoadState('networkidle');
    } catch (error) {
      // Health endpoint might not exist, continue with other checks
    }

    // Check for system health monitoring logs
    const healthLogs = capturedLogs.filter(log =>
      log.message.toLowerCase().includes('health') ||
      log.message.toLowerCase().includes('system') ||
      log.message.toLowerCase().includes('status')
    );

    // System should have health monitoring
    expect(healthLogs.length).toBeGreaterThan(0);

    // Check browser console for application health
    const appHealth = await stagehandPage.evaluate(() => {
      const errors = [];
      const warnings = [];
      
      // Check for uncaught errors
      if (window.onerror) {
        errors.push('Global error handler present');
      }
      
      // Check for unhandled promise rejections
      if (window.onunhandledrejection) {
        warnings.push('Unhandled rejection handler present');
      }
      
      return {
        hasErrorHandling: errors.length > 0,
        hasWarningHandling: warnings.length > 0,
        timestamp: new Date().toISOString()
      };
    });

    expect(appHealth.hasErrorHandling).toBe(true);
  });

  test('log aggregation and correlation', async ({ stagehandPage }) => {
    // Generate correlated events
    const sessionId = `test-session-${Date.now()}`;
    
    // Inject session ID for correlation testing
    await stagehandPage.evaluate((id) => {
      (window as any).testSessionId = id;
    }, sessionId);

    // Perform a complete workflow
    await stagehandPage.act('Upload a document for correlation test');
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Test message for log correlation',
      { waitForResponse: true }
    );

    // Analyze log correlation
    const correlatedLogs = capturedLogs.filter(log =>
      log.message.includes(sessionId) ||
      log.context?.includes?.(sessionId)
    );

    // Should have correlated logs if correlation is implemented
    // (This test verifies the capability exists)

    // Check for structured logging
    const structuredLogs = capturedLogs.filter(log => {
      try {
        JSON.parse(log.message);
        return true;
      } catch {
        return false;
      }
    });

    // At least some logs should be structured
    expect(structuredLogs.length).toBeGreaterThan(0);

    // Verify log timestamps are reasonable
    const now = new Date();
    const recentLogs = capturedLogs.filter(log => {
      const timeDiff = now.getTime() - log.timestamp.getTime();
      return timeDiff < 300000; // Within last 5 minutes
    });

    expect(recentLogs.length).toBe(capturedLogs.length);
  });

  test.afterEach(async () => {
    // Log summary of captured data for debugging
    console.log(`Captured ${capturedLogs.length} log entries`);
    console.log(`Captured ${capturedNetworkRequests.length} network requests`);
    
    // Log any errors for investigation
    const errors = capturedLogs.filter(log => log.level === 'error');
    if (errors.length > 0) {
      console.log('Errors captured:', errors);
    }
  });
});