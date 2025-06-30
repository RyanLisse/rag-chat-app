import { initializeMonitoring } from '@/lib/monitoring';
import { registerOTel } from '@vercel/otel';

export async function register() {
  // Register Vercel's OpenTelemetry
  registerOTel({ serviceName: 'rag-chat-app' });

  // Initialize our custom monitoring
  await initializeMonitoring();
}
