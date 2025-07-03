import { registerOTel } from '@vercel/otel';

export async function register() {
  // Initialize OpenTelemetry with @vercel/otel
  registerOTel({
    serviceName: 'rag-chat-app',
    // Optionally configure additional settings
    ...(process.env.NODE_ENV === 'development' && {
      // Enable debug logging in development
      debug: true,
    }),
  });

  // Initialize our monitoring systems
  try {
    const { initializeMonitoring } = await import('@/lib/monitoring');
    await initializeMonitoring();
  } catch (error) {
    console.warn('Failed to initialize monitoring:', error);
  }
}
