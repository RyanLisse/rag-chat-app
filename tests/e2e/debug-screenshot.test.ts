// Debug test to see what's actually on the page
import { test, expect } from '@playwright/test';

test('debug: take screenshot and show page content', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
  
  // Get page title
  const title = await page.title();
  console.log('Page title:', title);
  
  // Get page content
  const bodyText = await page.locator('body').textContent();
  console.log('Page content preview (first 500 chars):', bodyText?.substring(0, 500));
  
  // Find all input elements
  const inputs = await page.locator('input, textarea').all();
  console.log('Found inputs:', inputs.length);
  for (let i = 0; i < Math.min(inputs.length, 5); i++) {
    const placeholder = await inputs[i].getAttribute('placeholder');
    const type = await inputs[i].getAttribute('type');
    const id = await inputs[i].getAttribute('id');
    const name = await inputs[i].getAttribute('name');
    const className = await inputs[i].getAttribute('class');
    console.log(`  Input ${i}: type="${type}", placeholder="${placeholder}", id="${id}", name="${name}", class="${className}"`);
  }
  
  // Find all buttons
  const buttons = await page.locator('button').all();
  console.log('Found buttons:', buttons.length);
  for (let i = 0; i < Math.min(buttons.length, 5); i++) {
    const text = await buttons[i].textContent();
    console.log(`  Button ${i}: "${text?.trim()}"`);
  }
  
  // This test always passes, it's just for debugging
  expect(true).toBe(true);
});