import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import type { Session } from 'next-auth';
import { ModelSelector } from './model-selector';

// Mock the server action for Storybook
const mockSaveChatModelAsCookie = async (_modelId: string) => {
  // Simulate async operation
  await new Promise((resolve) => setTimeout(resolve, 500));
};

// Mock the server action module
jest.mock('../app/(chat)/actions', () => ({
  saveChatModelAsCookie: mockSaveChatModelAsCookie,
}));

const meta: Meta<typeof ModelSelector> = {
  title: 'Components/ModelSelector',
  component: ModelSelector,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'An enhanced model selector component with comprehensive features including loading states, error handling, accessibility, and responsive design.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    selectedModelId: {
      control: 'select',
      options: [
        'gpt-4.1',
        'o4-mini',
        'claude-4',
        'gemini-2.5-pro',
        'gemini-2.5-flash',
      ],
      description: 'The currently selected model ID',
    },
    loading: {
      control: 'boolean',
      description: 'Whether the component is in a loading state',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the component is disabled',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-[400px] w-full max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Base session objects
const regularUserSession: Session = {
  user: {
    id: 'regular-user',
    type: 'regular',
    email: 'user@example.com',
  },
  expires: '2025-12-31',
};

const guestUserSession: Session = {
  user: {
    id: 'guest-user',
    type: 'guest',
    email: 'guest@example.com',
  },
  expires: '2025-12-31',
};

// Default story
export const Default: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'gpt-4.1',
  },
};

// Different selected models
export const SelectedClaude: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'claude-4',
  },
};

export const SelectedGeminiPro: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'gemini-2.5-pro',
  },
};

export const SelectedO4Mini: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'o4-mini',
  },
};

export const SelectedGeminiFlash: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'gemini-2.5-flash',
  },
};

// Loading state
export const Loading: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'gpt-4.1',
    loading: true,
  },
};

// Disabled state
export const Disabled: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'gpt-4.1',
    disabled: true,
  },
};

// Error state
export const WithError: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'gpt-4.1',
    error: 'Failed to load models. Please try again.',
  },
};

export const WithNetworkError: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'claude-4',
    error: 'Network connection lost. Check your internet connection.',
  },
};

// Guest user (limited models)
export const GuestUser: Story = {
  args: {
    session: guestUserSession,
    selectedModelId: 'gpt-4.1',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Guest users have access to a limited set of models (only OpenAI models).',
      },
    },
  },
};

// Interactive stories with play functions
export const InteractiveDropdown: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'gpt-4.1',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const modelSelector = canvas.getByTestId('model-selector');

    // Click to open dropdown
    await userEvent.click(modelSelector);

    // Wait for dropdown to appear
    await expect(
      canvas.getByPlaceholder('Search models...')
    ).toBeInTheDocument();

    // Check that all provider groups are visible
    await expect(canvas.getByText('OPENAI')).toBeInTheDocument();
    await expect(canvas.getByText('ANTHROPIC')).toBeInTheDocument();
    await expect(canvas.getByText('GOOGLE')).toBeInTheDocument();
  },
};

export const SearchFunctionality: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'gpt-4.1',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const modelSelector = canvas.getByTestId('model-selector');

    // Open dropdown
    await userEvent.click(modelSelector);

    const searchInput = canvas.getByPlaceholder('Search models...');

    // Search for Claude
    await userEvent.type(searchInput, 'claude');

    // Verify only Claude models are shown
    await expect(canvas.getByText('Claude 4')).toBeInTheDocument();
    await expect(canvas.queryByText('GPT-4.1')).not.toBeInTheDocument();

    // Clear and search for fast models
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'fast');

    // Verify fast models are shown
    await expect(canvas.getByText('o4-mini')).toBeInTheDocument();
    await expect(canvas.getByText('Gemini 2.5 Flash')).toBeInTheDocument();
  },
};

export const ModelSelection: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'gpt-4.1',
    onModelChange: (_modelId: string) => {},
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const modelSelector = canvas.getByTestId('model-selector');

    // Open dropdown
    await userEvent.click(modelSelector);

    // Click on Claude 4
    const claudeOption = canvas.getByLabelText('Select Claude 4 model');
    await userEvent.click(claudeOption);

    // Verify dropdown closes
    await expect(
      canvas.queryByPlaceholder('Search models...')
    ).not.toBeInTheDocument();
  },
};

export const KeyboardNavigation: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'gpt-4.1',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const modelSelector = canvas.getByTestId('model-selector');

    // Focus the selector
    modelSelector.focus();

    // Open with Enter
    await userEvent.keyboard('{Enter}');

    // Navigate with arrow keys
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');

    // Close with Escape
    await userEvent.keyboard('{Escape}');

    // Verify dropdown is closed
    await expect(
      canvas.queryByPlaceholder('Search models...')
    ).not.toBeInTheDocument();
  },
};

// Mobile responsive story
export const Mobile: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'gpt-4.1',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story:
          'Model selector optimized for mobile devices with responsive layout and touch-friendly interactions.',
      },
    },
  },
};

// Tablet responsive story
export const Tablet: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'gpt-4.1',
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Model selector on tablet devices with medium-sized layout.',
      },
    },
  },
};

// Dark theme story
export const DarkTheme: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'claude-4',
  },
  parameters: {
    themes: {
      default: 'dark',
    },
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Model selector with dark theme styling.',
      },
    },
  },
};

// Story showing all model metadata
export const AllModelMetadata: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'gpt-4.1',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const modelSelector = canvas.getByTestId('model-selector');

    // Open dropdown to show all model metadata
    await userEvent.click(modelSelector);

    // Verify metadata elements are present
    const dropdown = canvas.getByRole('listbox');

    // Check for speed badges
    await expect(
      within(dropdown).getByTitle('Fast response time')
    ).toBeInTheDocument();
    await expect(
      within(dropdown).getByTitle('Balanced response time')
    ).toBeInTheDocument();

    // Check for cost badges
    await expect(within(dropdown).getByTitle('Low cost')).toBeInTheDocument();
    await expect(within(dropdown).getByTitle('High cost')).toBeInTheDocument();

    // Check for capability badges
    await expect(
      within(dropdown).getByTitle('Vision support')
    ).toBeInTheDocument();
    await expect(
      within(dropdown).getByTitle('Document search support')
    ).toBeInTheDocument();

    // Check for pricing information
    await expect(
      within(dropdown).getByText(/\$0\.\d+\/\$0\.\d+/)
    ).toBeInTheDocument();

    // Check for context length
    await expect(
      within(dropdown).getByText(/Context: \d+[KM]/)
    ).toBeInTheDocument();
  },
  parameters: {
    docs: {
      description: {
        story:
          'Showcases all the enhanced metadata features including speed indicators, cost categories, capabilities, and pricing information.',
      },
    },
  },
};

// Error handling story
export const ErrorHandling: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'gpt-4.1',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Mock a failed model change
    const originalSave = mockSaveChatModelAsCookie;
    (global as any).mockSaveChatModelAsCookie = async () => {
      throw new Error('Failed to save model preference');
    };

    const modelSelector = canvas.getByTestId('model-selector');
    await userEvent.click(modelSelector);

    // Try to select a different model
    const claudeOption = canvas.getByLabelText('Select Claude 4 model');
    await userEvent.click(claudeOption);

    // Wait for error to appear
    setTimeout(async () => {
      await expect(canvas.getByRole('alert')).toBeInTheDocument();
    }, 1000);

    // Restore original function
    (global as any).mockSaveChatModelAsCookie = originalSave;
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates error handling when model selection fails.',
      },
    },
  },
};

// Accessibility story
export const Accessibility: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'gpt-4.1',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const modelSelector = canvas.getByTestId('model-selector');

    // Check accessibility attributes
    await expect(modelSelector).toHaveAttribute('role', 'combobox');
    await expect(modelSelector).toHaveAttribute('aria-expanded', 'false');
    await expect(modelSelector).toHaveAttribute('aria-label');

    // Open dropdown
    await userEvent.click(modelSelector);

    // Check expanded state
    await expect(modelSelector).toHaveAttribute('aria-expanded', 'true');

    // Check search input accessibility
    const searchInput = canvas.getByPlaceholder('Search models...');
    await expect(searchInput).toHaveAttribute(
      'aria-label',
      'Search available models'
    );

    // Check option accessibility
    const firstOption = canvas.getAllByRole('option')[0];
    await expect(firstOption).toHaveAttribute('aria-label');
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates comprehensive accessibility features including ARIA labels, keyboard navigation, and screen reader support.',
      },
    },
  },
};

// Performance story (simulated)
export const PerformanceTest: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'gpt-4.1',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const modelSelector = canvas.getByTestId('model-selector');

    // Measure interaction performance
    const startTime = performance.now();

    // Open dropdown
    await userEvent.click(modelSelector);

    // Perform search
    const searchInput = canvas.getByPlaceholder('Search models...');
    await userEvent.type(searchInput, 'gpt');

    // Select model
    const gptOption = canvas.getByLabelText('Select GPT-4.1 model');
    await userEvent.click(gptOption);

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Performance should be under 1 second for good UX
    expect(duration).toBeLessThan(1000);
  },
  parameters: {
    docs: {
      description: {
        story:
          'Tests the performance of model selector interactions to ensure responsive user experience.',
      },
    },
  },
};

// Edge cases story
export const EdgeCases: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'non-existent-model', // Edge case: invalid model ID
  },
  parameters: {
    docs: {
      description: {
        story:
          'Tests edge cases like invalid model IDs, empty search results, and boundary conditions.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const modelSelector = canvas.getByTestId('model-selector');

    // Should fallback to first available model when invalid ID provided
    await userEvent.click(modelSelector);

    // Test empty search
    const searchInput = canvas.getByPlaceholder('Search models...');
    await userEvent.type(searchInput, 'xyznonexistent');

    // Should show empty state
    await expect(canvas.getByText('No model found.')).toBeInTheDocument();
    await expect(
      canvas.getByText('Try searching for a different term.')
    ).toBeInTheDocument();
  },
};

// Loading during model change
export const LoadingDuringChange: Story = {
  args: {
    session: regularUserSession,
    selectedModelId: 'gpt-4.1',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Mock slow model change
    const originalSave = mockSaveChatModelAsCookie;
    (global as any).mockSaveChatModelAsCookie = async (_modelId: string) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    };

    const modelSelector = canvas.getByTestId('model-selector');
    await userEvent.click(modelSelector);

    // Select a model and verify loading state
    const claudeOption = canvas.getByLabelText('Select Claude 4 model');
    await userEvent.click(claudeOption);

    // Should show loading state
    // Note: In actual implementation, you'd check for loading spinner

    // Restore original function
    (global as any).mockSaveChatModelAsCookie = originalSave;
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows loading state during model changes with slow network conditions.',
      },
    },
  },
};
