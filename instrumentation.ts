import { registerOTel } from '@vercel/otel';
import { initializeMonitoring } from '@/lib/monitoring';

export async function register() {
  // Register Vercel's OpenTelemetry
  registerOTel({ serviceName: 'rag-chat-app' });
  
  // Initialize our custom monitoring
  await initializeMonitoring();
}
