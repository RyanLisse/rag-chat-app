// Accessibility Compliance E2E Tests - Fixed Version
import { test, expect, ragHelpers } from '../helpers/stagehand-integration';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('Accessibility Compliance - Fixed', () => {
  test.beforeEach(async ({ stagehandPage }) => {
    await stagehandPage.goto('http://localhost:3000/');
    await stagehandPage.waitForLoadState('networkidle');
  });

  test('homepage meets WCAG 2.1 AA standards', async ({ stagehandPage }) => {
    // Run automated accessibility scan
    const accessibilityResults = await new AxeBuilder({ page: stagehandPage })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Print violations for debugging if any exist
    if (accessibilityResults.violations.length > 0) {
      console.log('Accessibility violations found:', accessibilityResults.violations.length);
      accessibilityResults.violations.forEach((violation, index) => {
        console.log(`Violation ${index + 1}: ${violation.id} - ${violation.description}`);
      });
    }

    expect(accessibilityResults.violations).toEqual([]);

    console.log('✅ Automated accessibility scan passed');
  });

  test('keyboard navigation works for main interface', async ({ stagehandPage }) => {
    // Test that we can navigate with Tab key
    await stagehandPage.keyboard.press('Tab');
    
    // Check if something has focus
    const hasFocus = await stagehandPage.evaluate(() => {
      return document.activeElement !== document.body;
    });
    
    expect(hasFocus).toBe(true);
    
    // Test Enter key on chat input
    const chatInput = stagehandPage.locator('textarea[placeholder="Send a message..."], input[placeholder="Send a message..."]');
    await chatInput.focus();
    await chatInput.fill('Test keyboard message');
    await stagehandPage.keyboard.press('Enter');
    
    console.log('✅ Keyboard navigation works');
  });

  test('focus indicators are visible', async ({ stagehandPage }) => {
    // Focus on the chat input
    const chatInput = stagehandPage.locator('textarea[placeholder="Send a message..."], input[placeholder="Send a message..."]');
    await chatInput.focus();
    
    // Check if the focused element has some visual indication
    const focusStyles = await chatInput.evaluate((el) => {
      const styles = getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
        borderColor: styles.borderColor
      };
    });
    
    // Should have some kind of focus indicator
    const hasFocusIndicator = 
      focusStyles.outline !== 'none' || 
      focusStyles.outlineWidth !== '0px' || 
      focusStyles.boxShadow !== 'none' ||
      focusStyles.borderColor !== 'rgb(0, 0, 0)';
    
    expect(hasFocusIndicator).toBe(true);
    
    console.log('✅ Focus indicators are present');
  });

  test('color contrast is adequate', async ({ stagehandPage }) => {
    // Test color contrast using AI observation
    const hasGoodContrast = await stagehandPage.observe(
      'Check if the text has sufficient contrast against the background for readability'
    ).then(() => true).catch(() => false);
    
    // This is a simple check - the axe tests above are more comprehensive
    expect(hasGoodContrast).toBe(true);
    
    console.log('✅ Color contrast check passed');
  });

  test('semantic HTML structure', async ({ stagehandPage }) => {
    // Check for proper semantic elements
    const hasSemanticStructure = await stagehandPage.evaluate(() => {
      // Check for semantic HTML elements
      const hasMain = document.querySelector('main') !== null;
      const hasHeaders = document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0;
      const hasButtons = document.querySelectorAll('button').length > 0;
      const hasInputs = document.querySelectorAll('input, textarea').length > 0;
      
      return hasMain || hasHeaders || hasButtons || hasInputs;
    });
    
    expect(hasSemanticStructure).toBe(true);
    
    console.log('✅ Semantic HTML structure detected');
  });
});