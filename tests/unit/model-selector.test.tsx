import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ModelSelector } from '@/components/model-selector';
import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { chatModels } from '@/lib/ai/models';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import type { Session } from 'next-auth';

// Configure timeout for user interaction tests
const INTERACTION_TIMEOUT = 10000;




// Get mock from module
const { saveChatModelAsCookie: mockSaveChatModelAsCookie } = await import('@/app/(chat)/actions');

describe.skip('ModelSelector', () => {
  const mockSession: Session = {
    user: {
      id: 'test-user',
      type: 'regular',
      email: 'test@example.com',
    },
    expires: '2025-01-01',
  };

  beforeEach(() => {
    mockSaveChatModelAsCookie.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up any remaining state
    mockSaveChatModelAsCookie.mockClear();
  
  });

  it('renders with selected model', () => {
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
      />
    );

    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeInTheDocument();
    expect(combobox).toHaveAttribute('aria-label', 'Current model: GPT-4.1. Click to change model.');
    expect(screen.getByText('GPT-4.1')).toBeInTheDocument();
    expect(screen.getByText('🟢')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
      />
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    const searchInput = screen.getByPlaceholder('Search models...');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('aria-label', 'Search available models');
    expect(screen.getByText('OPENAI')).toBeInTheDocument();
    expect(screen.getByText('ANTHROPIC')).toBeInTheDocument();
    expect(screen.getByText('GOOGLE')).toBeInTheDocument();
  });

  it('displays model metadata correctly', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
      />
    );

    await user.click(screen.getByRole('combobox'));

    // Check GPT-4.1 metadata
    const gpt4Item = screen.getByText('GPT-4.1').closest('[role="option"]');
    expect(gpt4Item).toHaveTextContent('Context: 128K');
    expect(gpt4Item).toHaveTextContent('$0.010/$0.030');
    expect(gpt4Item).toHaveTextContent('Recommended');
    expect(gpt4Item).toHaveTextContent('Balanced');
    expect(gpt4Item).toHaveTextContent('High');
    
    // Check for capability badges
    const visionBadge = within(gpt4Item!).getByTitle('Vision support');
    expect(visionBadge).toBeInTheDocument();
    
    const docSearchBadge = within(gpt4Item!).getByTitle('Document search support');
    expect(docSearchBadge).toBeInTheDocument();
  });

  it('filters models based on search input', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
      />
    );

    await user.click(screen.getByRole('combobox'));
    const searchInput = screen.getByPlaceholder('Search models...');
    
    await user.type(searchInput, 'claude');

    expect(screen.getByText('Claude 4')).toBeInTheDocument();
    expect(screen.queryByText('GPT-4.1')).not.toBeInTheDocument();
    expect(screen.queryByText('Gemini 2.5 Pro')).not.toBeInTheDocument();
  });

  it('filters by tags', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
      />
    );

    await user.click(screen.getByRole('combobox'));
    const searchInput = screen.getByPlaceholder('Search models...');
    
    await user.type(searchInput, 'fast');

    expect(screen.getByText('o4-mini')).toBeInTheDocument();
    expect(screen.getByText('Gemini 2.5 Flash')).toBeInTheDocument();
    expect(screen.queryByText('GPT-4.1')).not.toBeInTheDocument();
  });

  it('selects a new model and saves it', async () => {
    const mockOnModelChange = vi.fn(() => {});
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
        onModelChange={mockOnModelChange}
      />
    );

    await user.click(screen.getByRole('combobox'));
    
    const claudeOption = screen.getByText('Claude 4').closest('[role="option"]');
    expect(claudeOption).toBeInTheDocument();
    expect(claudeOption).toHaveAttribute('aria-label', 'Select Claude 4 model');
    
    await user.click(claudeOption!);

    await waitFor(() => {
      expect(mockSaveChatModelAsCookie).toHaveBeenCalledWith('claude-4');
      expect(mockOnModelChange).toHaveBeenCalledWith('claude-4');
    });
  });

  it('shows correct models for guest users', async () => {
    const guestSession: Session = {
      ...mockSession,
      user: {
        ...mockSession.user,
        type: 'guest',
      },
    };
    
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={guestSession}
        selectedModelId="gpt-4.1"
      />
    );

    await user.click(screen.getByRole('combobox'));

    // Guest users should only see OpenAI models
    expect(screen.getByText('GPT-4.1')).toBeInTheDocument();
    expect(screen.getByText('o4-mini')).toBeInTheDocument();
    expect(screen.queryByText('Claude 4')).not.toBeInTheDocument();
    expect(screen.queryByText('Gemini 2.5 Pro')).not.toBeInTheDocument();
  });

  it('displays pricing information correctly', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
      />
    );

    await user.click(screen.getByRole('combobox'));

    // Check o4-mini pricing (should show more decimal places for small values)
    const o4MiniItem = screen.getByText('o4-mini').closest('[role="option"]');
    expect(o4MiniItem).toHaveTextContent('$0.0020/$0.008');

    // Check Gemini Flash pricing
    const geminiFlashItem = screen.getByText('Gemini 2.5 Flash').closest('[role="option"]');
    expect(geminiFlashItem).toHaveTextContent('$0.0013/$0.005');
  });

  it('displays context length in appropriate units', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
      />
    );

    await user.click(screen.getByRole('combobox'));

    // Check Gemini Pro context (should show in M)
    const geminiProItem = screen.getByText('Gemini 2.5 Pro').closest('[role="option"]');
    expect(geminiProItem).toHaveTextContent('Context: 2.1M');

    // Check Claude context (should show in K)
    const claudeItem = screen.getByText('Claude 4').closest('[role="option"]');
    expect(claudeItem).toHaveTextContent('Context: 200K');
  });

  it('groups models by provider', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
      />
    );

    await user.click(screen.getByRole('combobox'));

    const groups = screen.getAllByRole('group');
    expect(groups).toHaveLength(3); // OpenAI, Anthropic, Google

    // Check provider headers with accessibility labels
    const openaiHeader = screen.getByLabelText('OpenAI models');
    expect(openaiHeader).toBeInTheDocument();
    const anthropicHeader = screen.getByLabelText('Anthropic models');  
    expect(anthropicHeader).toBeInTheDocument();
    const googleHeader = screen.getByLabelText('Google models');
    expect(googleHeader).toBeInTheDocument();
    
    expect(screen.getByText('OPENAI')).toBeInTheDocument();
    expect(screen.getByText('ANTHROPIC')).toBeInTheDocument();
    expect(screen.getByText('GOOGLE')).toBeInTheDocument();
  });

  it('displays loading state correctly', () => {
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
        loading={true}
      />
    );

    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeDisabled();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('displays error state correctly', () => {
    const errorMessage = 'Failed to load models';
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
        error={errorMessage}
      />
    );

    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveAttribute('aria-describedby', 'model-selector-error');
    expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
    expect(screen.getByLabelText('Alert')).toBeInTheDocument();
  });

  it('handles disabled state correctly', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
        disabled={true}
      />
    );

    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeDisabled();
    
    // Should not open dropdown when disabled
    await user.click(combobox);
    expect(screen.queryByPlaceholder('Search models...')).not.toBeInTheDocument();
  }, INTERACTION_TIMEOUT);

  it('handles model selection error gracefully', async () => {
    mockSaveChatModelAsCookie.mockRejectedValueOnce(new Error('Network error'));
    
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
      />
    );

    await user.click(screen.getByRole('combobox'));
    const claudeOption = screen.getByText('Claude 4').closest('[role="option"]');
    await user.click(claudeOption!);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });
  });

  it('handles keyboard navigation with Escape key', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
      />
    );

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);
    
    expect(screen.getByPlaceholder('Search models...')).toBeInTheDocument();
    
    await user.keyboard('{Escape}');
    
    await waitFor(() => {
      expect(screen.queryByPlaceholder('Search models...')).not.toBeInTheDocument();
    });
  });

  it('displays speed and cost metadata badges', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
      />
    );

    await user.click(screen.getByRole('combobox'));

    // Check o4-mini (fast, low cost)
    const o4MiniItem = screen.getByText('o4-mini').closest('[role="option"]');
    expect(within(o4MiniItem!).getByTitle('Fast response time')).toBeInTheDocument();
    expect(within(o4MiniItem!).getByTitle('Low cost')).toBeInTheDocument();

    // Check GPT-4.1 (balanced, high cost)
    const gpt4Item = screen.getByText('GPT-4.1').closest('[role="option"]');
    expect(within(gpt4Item!).getByTitle('Balanced response time')).toBeInTheDocument();
    expect(within(gpt4Item!).getByTitle('High cost')).toBeInTheDocument();
  });

  it('shows enhanced empty search state', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
      />
    );

    await user.click(screen.getByRole('combobox'));
    const searchInput = screen.getByPlaceholder('Search models...');
    await user.type(searchInput, 'nonexistentmodel');

    expect(screen.getByText('No model found.')).toBeInTheDocument();
    expect(screen.getByText('Try searching for a different term.')).toBeInTheDocument();
  });

  it('displays provider name in aria labels', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
      />
    );

    const providerIcon = screen.getByLabelText('OpenAI provider');
    expect(providerIcon).toBeInTheDocument();
  });

  it('prevents selection when model is being changed', async () => {
    mockSaveChatModelAsCookie.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
      />
    );

    await user.click(screen.getByRole('combobox'));
    const claudeOption = screen.getByText('Claude 4').closest('[role="option"]');
    
    // Start first selection
    await user.click(claudeOption!);
    
    // Try to select another model while first is still processing
    await user.click(screen.getByRole('combobox'));
    const geminiOption = screen.getByText('Gemini 2.5 Pro').closest('[role="option"]');
    
    // Second selection should be prevented
    expect(geminiOption).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('displays loading spinner during model change', async () => {
    let resolvePromise: () => void;
    const promise = new Promise<void>(resolve => {
      resolvePromise = resolve;
    });
    mockSaveChatModelAsCookie.mockReturnValue(promise);
    
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
      />
    );

    await user.click(screen.getByRole('combobox'));
    const claudeOption = screen.getByText('Claude 4').closest('[role="option"]');
    await user.click(claudeOption!);

    // Should show loading spinner for the selected item
    await user.click(screen.getByRole('combobox'));
    const updatedClaudeOption = screen.getByText('Claude 4').closest('[role="option"]');
    expect(within(updatedClaudeOption!).getByLabelText('Loading')).toBeInTheDocument();
    
    resolvePromise!();
  });

  it('passes through additional props to Button', () => {
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
        data-testid="custom-selector"
        className="custom-class"
      />
    );

    const combobox = screen.getByTestId('custom-selector');
    expect(combobox).toHaveClass('custom-class');
  });

  it('displays capability badges with proper accessibility', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
      />
    );

    await user.click(screen.getByRole('combobox'));
    
    // Check Gemini Pro which has all capabilities
    const geminiProItem = screen.getByText('Gemini 2.5 Pro').closest('[role="option"]');
    expect(within(geminiProItem!).getByTitle('Vision support')).toBeInTheDocument();
    expect(within(geminiProItem!).getByTitle('Audio input support')).toBeInTheDocument();
  });

  it('formats context length correctly', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        session={mockSession}
        selectedModelId="gpt-4.1"
      />
    );

    await user.click(screen.getByRole('combobox'));

    // Check Gemini Pro context (should show in M)
    const geminiProItem = screen.getByText('Gemini 2.5 Pro').closest('[role="option"]');
    expect(geminiProItem).toHaveTextContent('Context: 2.1M');

    // Check Claude context (should show in K)
    const claudeItem = screen.getByText('Claude 4').closest('[role="option"]');
    expect(claudeItem).toHaveTextContent('Context: 200K');
  });
});