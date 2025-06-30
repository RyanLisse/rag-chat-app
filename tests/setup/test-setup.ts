import { beforeEach } from 'vitest';

// Reset environment variables before each test
beforeEach(() => {
  // Preserve original environment variables
  const originalEnv = { ...process.env };
  
  // Clear test-specific env vars
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  
  return () => {
    // Restore original environment variables
    process.env = originalEnv;
  };
});