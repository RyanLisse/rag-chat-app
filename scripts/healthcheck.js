#!/usr/bin/env bun

// Health check script for Docker container
const HEALTH_CHECK_URL = process.env.HEALTH_CHECK_URL || 'http://localhost:3000/api/health';
const TIMEOUT = 5000; // 5 seconds

async function checkHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);
    
    const response = await fetch(HEALTH_CHECK_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'HealthCheck/1.0'
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.error(`Health check failed with status: ${response.status}`);
      process.exit(1);
    }
    
    const data = await response.json();
    
    // Check response structure
    if (data.status !== 'ok' && data.status !== 'healthy') {
      console.error('Health check returned unhealthy status:', data);
      process.exit(1);
    }
    
    console.log('Health check passed');
    process.exit(0);
  } catch (error) {
    console.error('Health check failed:', error.message);
    process.exit(1);
  }
}

checkHealth();