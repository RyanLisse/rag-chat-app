// Unit Tests for Custom Hooks
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { SWRConfig } from 'swr';
import React from 'react';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { useMobile } from '@/hooks/use-mobile';

// Mock external dependencies
const mockUpdateChatVisibility = mock(() => Promise.resolve());
mock.module('@/app/(chat)/actions', () => ({
  updateChatVisibility: mockUpdateChatVisibility,
}));

const mockGetChatHistoryPaginationKey = mock(() => ['history', 'key']);
mock.module('@/components/sidebar-history', () => ({
  getChatHistoryPaginationKey: mockGetChatHistoryPaginationKey,
  type ChatHistory: {},
}));

// Helper to create SWR wrapper
const createWrapper = (fallbackData: any = {}) => {
  return ({ children }: { children: React.ReactNode }) => (
    <SWRConfig value={{ fallbackData, provider: () => new Map() }}>
      {children}
    </SWRConfig>
  );
};

describe('useChatVisibility', () => {
  beforeEach(() => {
    mockUpdateChatVisibility.mockClear();
  });

  it('should return initial visibility type when no history is available', () => {
    const wrapper = createWrapper({});
    
    const { result } = renderHook(
      () => useChatVisibility({
        chatId: 'test-chat-id',
        initialVisibilityType: 'public',
      }),
      { wrapper }
    );

    expect(result.current.visibilityType).toBe('public');
  });

  it('should return visibility from history when available', () => {
    const historyData = {
      '/api/history': {
        data: {
          chats: [
            { id: 'test-chat-id', visibility: 'private' },
            { id: 'other-chat-id', visibility: 'public' },
          ],
        },
      },
    };

    const wrapper = createWrapper(historyData);
    
    const { result } = renderHook(
      () => useChatVisibility({
        chatId: 'test-chat-id',
        initialVisibilityType: 'public',
      }),
      { wrapper }
    );

    expect(result.current.visibilityType).toBe('private');
  });

  it('should return private when chat not found in history', () => {
    const historyData = {
      '/api/history': {
        data: {
          chats: [
            { id: 'other-chat-id', visibility: 'public' },
          ],
        },
      },
    };

    const wrapper = createWrapper(historyData);
    
    const { result } = renderHook(
      () => useChatVisibility({
        chatId: 'non-existent-chat',
        initialVisibilityType: 'public',
      }),
      { wrapper }
    );

    expect(result.current.visibilityType).toBe('private');
  });

  it('should update visibility type when setVisibilityType is called', async () => {
    const wrapper = createWrapper({});
    
    const { result } = renderHook(
      () => useChatVisibility({
        chatId: 'test-chat-id',
        initialVisibilityType: 'public',
      }),
      { wrapper }
    );

    act(() => {
      result.current.setVisibilityType('private');
    });

    expect(mockUpdateChatVisibility).toHaveBeenCalledWith({
      chatId: 'test-chat-id',
      visibility: 'private',
    });
  });

  it('should handle different visibility types', () => {
    const visibilityTypes = ['public', 'private'] as const;
    
    visibilityTypes.forEach(visibility => {
      const wrapper = createWrapper({});
      
      const { result } = renderHook(
        () => useChatVisibility({
          chatId: 'test-chat-id',
          initialVisibilityType: visibility,
        }),
        { wrapper }
      );

      expect(result.current.visibilityType).toBe(visibility);
    });
  });
});

describe('useScrollToBottom', () => {
  let mockElement: HTMLElement;
  let mockScrollTo: ReturnType<typeof mock>;

  beforeEach(() => {
    mockScrollTo = mock(() => {});
    mockElement = {
      scrollTo: mockScrollTo,
      scrollHeight: 1000,
      clientHeight: 500,
      scrollTop: 0,
    } as any;
  });

  it('should provide scrollToBottom function', () => {
    const { result } = renderHook(() => useScrollToBottom());
    
    expect(typeof result.current.scrollToBottom).toBe('function');
    expect(typeof result.current.scrollToBottomOfLastMessage).toBe('function');
  });

  it('should scroll to bottom when scrollToBottom is called', () => {
    const { result } = renderHook(() => useScrollToBottom());
    
    // Mock document.querySelector to return our mock element
    const mockQuerySelector = mock(() => mockElement);
    document.querySelector = mockQuerySelector;

    act(() => {
      result.current.scrollToBottom();
    });

    expect(mockScrollTo).toHaveBeenCalledWith({
      top: mockElement.scrollHeight,
      behavior: 'smooth',
    });
  });

  it('should handle missing scroll container gracefully', () => {
    const { result } = renderHook(() => useScrollToBottom());
    
    // Mock document.querySelector to return null
    document.querySelector = mock(() => null);

    // Should not throw error
    expect(() => {
      act(() => {
        result.current.scrollToBottom();
      });
    }).not.toThrow();
  });
});

describe('useAutoResume', () => {
  let mockPush: ReturnType<typeof mock>;
  let mockRouter: any;

  beforeEach(() => {
    mockPush = mock(() => Promise.resolve());
    mockRouter = { push: mockPush };
    
    // Mock next/navigation
    mock.module('next/navigation', () => ({
      useRouter: () => mockRouter,
    }));
  });

  afterEach(() => {
    mock.restore();
  });

  it('should provide auto-resume functionality', () => {
    const { result } = renderHook(() => useAutoResume());
    
    expect(typeof result.current.resumeChat).toBe('function');
    expect(typeof result.current.isResuming).toBe('boolean');
  });

  it('should resume chat with correct URL', async () => {
    const { result } = renderHook(() => useAutoResume());
    
    await act(async () => {
      await result.current.resumeChat('test-chat-id');
    });

    expect(mockPush).toHaveBeenCalledWith('/chat/test-chat-id');
  });

  it('should track resuming state', async () => {
    const { result } = renderHook(() => useAutoResume());
    
    expect(result.current.isResuming).toBe(false);

    const resumePromise = act(async () => {
      return result.current.resumeChat('test-chat-id');
    });

    // During resume, isResuming should be true
    expect(result.current.isResuming).toBe(true);

    await resumePromise;

    // After resume, isResuming should be false
    expect(result.current.isResuming).toBe(false);
  });

  it('should handle navigation errors gracefully', async () => {
    mockPush.mockRejectedValue(new Error('Navigation failed'));
    
    const { result } = renderHook(() => useAutoResume());
    
    // Should not throw, but handle error internally
    await act(async () => {
      await result.current.resumeChat('test-chat-id');
    });

    expect(result.current.isResuming).toBe(false);
  });
});

describe('useMobile', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('should detect mobile screen sizes', () => {
    // Mock matchMedia for mobile
    window.matchMedia = mock((query: string) => ({
      matches: query.includes('max-width: 768px'),
      media: query,
      onchange: null,
      addListener: mock(() => {}),
      removeListener: mock(() => {}),
      addEventListener: mock(() => {}),
      removeEventListener: mock(() => {}),
      dispatchEvent: mock(() => true),
    }));

    const { result } = renderHook(() => useMobile());
    
    expect(result.current).toBe(true);
  });

  it('should detect desktop screen sizes', () => {
    // Mock matchMedia for desktop
    window.matchMedia = mock((query: string) => ({
      matches: false, // Desktop doesn't match mobile query
      media: query,
      onchange: null,
      addListener: mock(() => {}),
      removeListener: mock(() => {}),
      addEventListener: mock(() => {}),
      removeEventListener: mock(() => {}),
      dispatchEvent: mock(() => true),
    }));

    const { result } = renderHook(() => useMobile());
    
    expect(result.current).toBe(false);
  });

  it('should respond to media query changes', () => {
    let mediaQueryCallback: ((e: MediaQueryListEvent) => void) | null = null;
    
    // Mock matchMedia with listener support
    window.matchMedia = mock((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: mock((callback: any) => {
        mediaQueryCallback = callback;
      }),
      removeListener: mock(() => {}),
      addEventListener: mock((event: string, callback: any) => {
        if (event === 'change') {
          mediaQueryCallback = callback;
        }
      }),
      removeEventListener: mock(() => {}),
      dispatchEvent: mock(() => true),
    }));

    const { result } = renderHook(() => useMobile());
    
    expect(result.current).toBe(false);

    // Simulate screen size change to mobile
    if (mediaQueryCallback) {
      act(() => {
        mediaQueryCallback({ matches: true } as MediaQueryListEvent);
      });
    }

    expect(result.current).toBe(true);
  });

  it('should handle missing matchMedia gracefully', () => {
    // Remove matchMedia entirely
    delete (window as any).matchMedia;

    // Should not throw and should default to false (desktop)
    const { result } = renderHook(() => useMobile());
    
    expect(result.current).toBe(false);
  });
});

describe('Hook Integration Tests', () => {
  it('should work together in realistic scenarios', () => {
    const wrapper = createWrapper({
      '/api/history': {
        data: {
          chats: [
            { id: 'mobile-chat', visibility: 'public' },
          ],
        },
      },
    });

    // Test multiple hooks together
    const { result: visibilityResult } = renderHook(
      () => useChatVisibility({
        chatId: 'mobile-chat',
        initialVisibilityType: 'private',
      }),
      { wrapper }
    );

    const { result: mobileResult } = renderHook(() => useMobile());
    const { result: scrollResult } = renderHook(() => useScrollToBottom());

    // All hooks should work independently
    expect(visibilityResult.current.visibilityType).toBe('public');
    expect(typeof mobileResult.current).toBe('boolean');
    expect(typeof scrollResult.current.scrollToBottom).toBe('function');
  });

  it('should clean up properly on unmount', () => {
    const { unmount } = renderHook(() => {
      useChatVisibility({ chatId: 'test', initialVisibilityType: 'public' });
      useMobile();
      useScrollToBottom();
    });

    // Should not throw on unmount
    expect(() => unmount()).not.toThrow();
  });
});