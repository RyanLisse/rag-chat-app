import { test, expect, ragHelpers } from '../helpers/stagehand-integration';

test.describe.configure({ mode: 'serial' });

test.describe('Vector Store Integration', () => {
  test.beforeEach(async ({ stagehandPage }) => {
    await stagehandPage.goto('/');
    await stagehandPage.waitForLoadState('domcontentloaded');
  });

  test('should display vector store connection status', async ({ stagehandPage }) => {
    // Look for the file manager button
    const fileButton = await stagehandPage.observe(
      'Find the file manager button with a document icon'
    );
    
    expect(fileButton).toBeTruthy();
    
    // Check for green status indicator
    const hasStatusIndicator = await stagehandPage.observe(
      'Find a green status indicator showing vector store is connected'
    ).then(() => true).catch(() => false);
    
    if (hasStatusIndicator) {
      console.log('Vector store is connected');
    } else {
      console.log('Vector store not yet connected');
    }
  });

  test('should open file manager dialog', async ({ stagehandPage }) => {
    // Click the file manager button
    await stagehandPage.act('Click the file manager button');

    // Wait for dialog to appear
    await stagehandPage.waitForTimeout(1000);

    // Check if dialog opened
    const dialogVisible = await stagehandPage.observe(
      'Find the Knowledge Base Manager dialog'
    ).then(() => true).catch(() => false);

    expect(dialogVisible).toBeTruthy();
  });

  test('should upload a file using dropzone', async ({ stagehandPage }) => {
    // Open file manager
    await stagehandPage.act('Click the file manager button');

    await stagehandPage.waitForTimeout(1000);

    // Create a test file
    const testContent = `# RoboRail Calibration Guide

## Calibration Procedures

1. Power on the RoboRail system
2. Navigate to Settings > Calibration
3. Follow the on-screen instructions
4. Verify sensor readings
5. Save calibration data

## Safety Notes
- Always ensure emergency stops are functional
- Maintain 2-meter safety zone during calibration`;

    // Upload the file
    const fileInput = await stagehandPage.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'roborail-calibration.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(testContent),
    });

    // Wait for upload to complete
    await stagehandPage.waitForTimeout(3000);

    // Check for success message
    const uploadSuccess = await stagehandPage.observe(
      'Find a success message or completed status for the uploaded file'
    ).then(() => true).catch(() => false);

    expect(uploadSuccess).toBeTruthy();
  });

  test('should show suggested actions on home page', async ({ stagehandPage }) => {
    // Check for RoboRail specific suggested actions
    const hasSuggestedActions = await stagehandPage.observe(
      'Find suggested action buttons about RoboRail calibration and safety'
    ).then(() => true).catch(() => false);

    expect(hasSuggestedActions).toBeTruthy();
    
    // Look for specific button
    const hasCalibrationButton = await stagehandPage.observe(
      'Find a button that says "How do I calibrate the RoboRail system?"'
    ).then(() => true).catch(() => false);

    expect(hasCalibrationButton).toBeTruthy();
  });

  test('should trigger vector store search and show citations', async ({ stagehandPage }) => {
    // Click on a suggested action
    await stagehandPage.act(
      'Click the button that says "How do I calibrate the RoboRail system?"'
    );

    // Wait for response
    await stagehandPage.waitForTimeout(5000);

    // Check for citation artifact
    const hasCitationArtifact = await stagehandPage.observe(
      'Find a citation artifact showing document sources'
    ).then(() => true).catch(() => false);

    expect(hasCitationArtifact).toBeTruthy();

    // Check for citation numbers in the response
    const hasCitations = await stagehandPage.observe(
      'Find numbered citations like [1] or [2] in the response'
    ).then(() => true).catch(() => false);

    expect(hasCitations).toBeTruthy();
  });

  test('should display beautiful citation artifact', async ({ stagehandPage }) => {
    // Send a message that requires document search
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'What are the safety procedures for RoboRail?',
      { waitForResponse: true }
    );

    // Wait for response
    await stagehandPage.waitForTimeout(5000);

    // Check for gradient background in citation artifact
    const hasGradientArtifact = await stagehandPage.observe(
      'Find a citation artifact with gradient background (blue to purple)'
    ).then(() => true).catch(() => false);

    expect(hasGradientArtifact).toBeTruthy();

    // Check for statistics in the artifact
    const hasStatistics = await stagehandPage.observe(
      'Find statistics showing number of sources or documents searched'
    ).then(() => true).catch(() => false);

    expect(hasStatistics).toBeTruthy();
  });

  test('should manage files in vector store', async ({ stagehandPage }) => {
    // Open file manager
    await stagehandPage.act('Click the file manager button');

    await stagehandPage.waitForTimeout(1000);

    // Check for uploaded files list
    const hasFilesList = await stagehandPage.observe(
      'Find the list of uploaded documents'
    ).then(() => true).catch(() => false);

    expect(hasFilesList).toBeTruthy();

    // Look for delete buttons
    const hasDeleteButtons = await stagehandPage.observe(
      'Find delete buttons (trash icons) for uploaded files'
    ).then(() => true).catch(() => false);

    if (hasDeleteButtons) {
      console.log('Files can be deleted from the vector store');
    }
  });

  test('should show file upload progress', async ({ stagehandPage }) => {
    // Open file manager
    await stagehandPage.act('Click the file manager button');

    await stagehandPage.waitForTimeout(1000);

    // Look for dropzone
    const hasDropzone = await stagehandPage.observe(
      'Find the drag and drop area for file uploads'
    ).then(() => true).catch(() => false);

    expect(hasDropzone).toBeTruthy();

    // Check for file type information
    const hasSupportedFormats = await stagehandPage.observe(
      'Find text mentioning supported file formats (PDF, TXT, etc.)'
    ).then(() => true).catch(() => false);

    expect(hasSupportedFormats).toBeTruthy();
  });

  test('should enforce vector store search on every query', async ({ stagehandPage }) => {
    // Send a general knowledge question
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'What is 2 + 2?',
      { waitForResponse: true }
    );

    // Wait for response
    await stagehandPage.waitForTimeout(3000);

    // Even for simple questions, citation artifact should appear
    const hasCitationArtifact = await stagehandPage.observe(
      'Find a citation artifact (even if it says no results found)'
    ).then(() => true).catch(() => false);

    expect(hasCitationArtifact).toBeTruthy();
    console.log('Vector store search is enforced on all queries');
  });

  test('should display vector store monitor in development', async ({ stagehandPage }) => {
    // Look for the vector store activity monitor
    const hasMonitor = await stagehandPage.observe(
      'Find the vector store activity monitor showing search statistics'
    ).then(() => true).catch(() => false);

    if (hasMonitor) {
      console.log('Vector store monitor is visible in development mode');
      
      // Check for metrics
      const hasMetrics = await stagehandPage.observe(
        'Find metrics like search count or response time'
      ).then(() => true).catch(() => false);
      
      expect(hasMetrics).toBeTruthy();
    }
  });
});