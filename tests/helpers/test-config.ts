// Centralized test configuration
export const TEST_CONFIG = {
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  timeout: {
    navigation: 60000,
    action: 30000,
    test: 120000,
  },
};

export function getTestURL(path: string = '/'): string {
  const base = TEST_CONFIG.baseURL.replace(/\/$/, ''); // Remove trailing slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}