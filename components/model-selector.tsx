'use client';

import {
  AlertCircle,
  Brain,
  Check,
  ChevronsUpDown,
  DollarSign,
  Eye,
  FileSearch,
  Gauge,
  Loader2,
  Mic,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  startTransition,
  useCallback,
  useMemo,
  useOptimistic,
  useState,
} from 'react';

import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { chatModels } from '@/lib/ai/models';
import { cn } from '@/lib/utils';
import type { Session } from 'next-auth';

const providerConfig = {
  openai: {
    icon: '🟢',
    name: 'OpenAI',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  anthropic: {
    icon: '🟠',
    name: 'Anthropic',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
  google: {
    icon: '🔵',
    name: 'Google',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
};

// Speed categories based on model characteristics
const modelSpeedConfig = {
  'gpt-4o-mini': 'fast',
  'gpt-4o-mini-2025-07-01': 'fast',
  'o1-mini': 'fast',
  'gemini-2.5-flash': 'fast',
  'gpt-4o': 'balanced',
  'gpt-4o-2025-07-01': 'balanced',
  'claude-4': 'balanced',
  'o1': 'thorough',
  'o1-preview': 'thorough',
  'gemini-2.5-pro': 'thorough',
} as const;

function getModelSpeed(modelId: string): 'fast' | 'balanced' | 'thorough' {
  return (
    modelSpeedConfig[modelId as keyof typeof modelSpeedConfig] || 'balanced'
  );
}

function getSpeedIcon(speed: 'fast' | 'balanced' | 'thorough') {
  switch (speed) {
    case 'fast':
      return <Zap className="h-3 w-3" />;
    case 'balanced':
      return <Gauge className="h-3 w-3" />;
    case 'thorough':
      return <Brain className="h-3 w-3" />;
  }
}

function getSpeedLabel(speed: 'fast' | 'balanced' | 'thorough') {
  switch (speed) {
    case 'fast':
      return 'Fast';
    case 'balanced':
      return 'Balanced';
    case 'thorough':
      return 'Thorough';
  }
}

function getCostCategory(
  inputPrice: number,
  outputPrice: number
): 'low' | 'medium' | 'high' {
  const avgPrice = (inputPrice + outputPrice) / 2;
  if (avgPrice < 0.002) {
    return 'low';
  }
  if (avgPrice < 0.01) {
    return 'medium';
  }
  return 'high';
}

function getCostLabel(category: 'low' | 'medium' | 'high') {
  switch (category) {
    case 'low':
      return 'Low cost';
    case 'medium':
      return 'Medium cost';
    case 'high':
      return 'High cost';
  }
}

function formatContextLength(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  return `${(tokens / 1000).toFixed(0)}K`;
}

function formatPrice(price: number): string {
  return price < 0.01 ? price.toFixed(4) : price.toFixed(3);
}

interface ModelSelectorProps extends React.ComponentProps<typeof Button> {
  session: Session;
  selectedModelId: string;
  className?: string;
  onModelChange?: (modelId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
}

export function ModelSelector({
  session,
  selectedModelId,
  className,
  onModelChange,
  disabled = false,
  loading = false,
  error = null,
  ...props
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);
  const [isChangingModel, setIsChangingModel] = useState(false);
  const [lastError, setLastError] = useState<string | null>(error);

  const userType = session.user.type;
  const { availableChatModelIds } = entitlementsByUserType[userType];

  const availableChatModels = chatModels.filter((chatModel) =>
    availableChatModelIds.includes(chatModel.id)
  );

  const selectedChatModel = useMemo(
    () =>
      availableChatModels.find(
        (chatModel) => chatModel.id === optimisticModelId
      ) || availableChatModels[0],
    [optimisticModelId, availableChatModels]
  );

  const filteredModels = useMemo(() => {
    const searchTerm = searchValue.toLowerCase();
    return availableChatModels.filter(
      (model) =>
        model.name.toLowerCase().includes(searchTerm) ||
        model.description.toLowerCase().includes(searchTerm) ||
        model.provider.toLowerCase().includes(searchTerm) ||
        model.tags?.some((tag) => tag.toLowerCase().includes(searchTerm))
    );
  }, [availableChatModels, searchValue]);

  const groupedModels = useMemo(() => {
    const grouped = filteredModels.reduce(
      (acc, model) => {
        if (!acc[model.provider]) {
          acc[model.provider] = [];
        }
        acc[model.provider].push(model);
        return acc;
      },
      {} as Record<string, typeof filteredModels>
    );
    return grouped;
  }, [filteredModels]);

  const handleModelSelect = useCallback(
    async (modelId: string) => {
      if (disabled || isChangingModel) {
        return;
      }

      try {
        setIsChangingModel(true);
        setLastError(null);
        setOpen(false);

        startTransition(() => {
          setOptimisticModelId(modelId);
        });

        await saveChatModelAsCookie(modelId);
        onModelChange?.(modelId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to change model';
        setLastError(errorMessage);
        console.error('Failed to change model:', err);
      } finally {
        setIsChangingModel(false);
      }
    },
    [disabled, isChangingModel, onModelChange]
  );

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false);
    }
  }, []);

  const isLoading = loading || isChangingModel;
  const hasError = lastError !== null;

  // Safety check - if no model is selected, return null
  if (!selectedChatModel) {
    return null;
  }

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            data-testid="model-selector"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={`Current model: ${selectedChatModel.name}. Click to change model.`}
            aria-describedby={hasError ? 'model-selector-error' : undefined}
            disabled={disabled || isLoading}
            className={cn(
              'h-8 md:h-9 text-xs md:text-sm min-w-[140px] md:min-w-[220px] justify-between',
              hasError && 'border-red-300 dark:border-red-700',
              className
            )}
            onKeyDown={handleKeyDown}
            {...props}
          >
            <div className="flex items-center gap-2 truncate">
              {isLoading ? (
                <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
              ) : (
                <span
                  className="text-sm md:text-base hidden sm:inline"
                  aria-label={`${providerConfig[selectedChatModel.provider].name} provider`}
                >
                  {providerConfig[selectedChatModel.provider].icon}
                </span>
              )}
              <span className="truncate">{selectedChatModel.name}</span>
              {hasError && (
                <AlertCircle className="h-3 w-3 md:h-4 md:w-4 shrink-0 text-red-500" />
              )}
            </div>
            <ChevronsUpDown className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 sm:w-[420px]" align="start">
          <Command>
            <CommandInput
              placeholder="Search models..."
              value={searchValue}
              onValueChange={setSearchValue}
              aria-label="Search available models"
            />
            <CommandList>
              <CommandEmpty>
                <div className="flex flex-col items-center gap-2 py-6">
                  <div className="text-muted-foreground">No model found.</div>
                  <div className="text-muted-foreground text-sm">
                    Try searching for a different term.
                  </div>
                </div>
              </CommandEmpty>
              {Object.entries(groupedModels).map(([provider, models]) => (
                <CommandGroup
                  key={provider}
                  heading={
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase">
                      <span
                        aria-label={`${providerConfig[provider as keyof typeof providerConfig].name} models`}
                      >
                        {
                          providerConfig[
                            provider as keyof typeof providerConfig
                          ].icon
                        }
                      </span>
                      <span>{provider}</span>
                    </div>
                  }
                >
                  {models.map((model) => {
                    const speed = getModelSpeed(model.id);
                    const costCategory = getCostCategory(
                      model.pricing.inputPer1kTokens,
                      model.pricing.outputPer1kTokens
                    );
                    const isSelected = optimisticModelId === model.id;

                    return (
                      <CommandItem
                        key={model.id}
                        value={model.id}
                        onSelect={() => handleModelSelect(model.id)}
                        disabled={isChangingModel}
                        className={cn(
                          'flex cursor-pointer flex-col items-start gap-2 p-3',
                          isSelected && 'bg-accent',
                          isChangingModel && 'cursor-not-allowed opacity-50'
                        )}
                        aria-label={`Select ${model.name} model`}
                      >
                        <div className="flex w-full items-start justify-between">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{model.name}</span>
                              {model.tags?.includes('recommended') && (
                                <Badge
                                  variant="secondary"
                                  className="bg-green-100 text-green-700 text-xs dark:bg-green-900 dark:text-green-300"
                                >
                                  <Sparkles className="mr-1 h-3 w-3" />
                                  Recommended
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className="text-xs"
                                title={`${getSpeedLabel(speed)} response time`}
                              >
                                {getSpeedIcon(speed)}
                                <span className="ml-1 hidden sm:inline">
                                  {getSpeedLabel(speed)}
                                </span>
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs',
                                  costCategory === 'low' &&
                                    'text-green-600 dark:text-green-400',
                                  costCategory === 'medium' &&
                                    'text-yellow-600 dark:text-yellow-400',
                                  costCategory === 'high' &&
                                    'text-red-600 dark:text-red-400'
                                )}
                                title={getCostLabel(costCategory)}
                              >
                                <DollarSign className="h-3 w-3" />
                                <span className="ml-1 hidden sm:inline">
                                  {getCostLabel(costCategory).split(' ')[0]}
                                </span>
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm">
                              {model.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isChangingModel && isSelected && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            <Check
                              className={cn(
                                'h-4 w-4 shrink-0',
                                isSelected ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                          </div>
                        </div>

                        <Separator className="my-1" />

                        <div className="grid w-full grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Brain className="h-3 w-3" />
                              <span>
                                Context:{' '}
                                {formatContextLength(model.contextLength)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <DollarSign className="h-3 w-3" />
                              <span title="Input price / Output price per 1K tokens">
                                ${formatPrice(model.pricing.inputPer1kTokens)}/
                                ${formatPrice(model.pricing.outputPer1kTokens)}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {model.capabilities.vision && (
                                <Badge
                                  variant="outline"
                                  className="h-auto px-1.5 py-0.5 text-xs"
                                  title="Vision support"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span className="ml-1 hidden sm:inline">
                                    Vision
                                  </span>
                                </Badge>
                              )}
                              {model.capabilities.audioInput && (
                                <Badge
                                  variant="outline"
                                  className="h-auto px-1.5 py-0.5 text-xs"
                                  title="Audio input support"
                                >
                                  <Mic className="h-3 w-3" />
                                  <span className="ml-1 hidden sm:inline">
                                    Audio
                                  </span>
                                </Badge>
                              )}
                              {model.capabilities.documentSearch && (
                                <Badge
                                  variant="outline"
                                  className="h-auto px-1.5 py-0.5 text-xs"
                                  title="Document search support"
                                >
                                  <FileSearch className="h-3 w-3" />
                                  <span className="ml-1 hidden sm:inline">
                                    Search
                                  </span>
                                </Badge>
                              )}
                            </div>
                            {model.tags?.includes('long-context') && (
                              <Badge
                                variant="outline"
                                className="text-muted-foreground text-xs"
                                title="Supports extended context length"
                              >
                                Long context
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {hasError && (
        <div
          id="model-selector-error"
          className="absolute top-full right-0 left-0 mt-1 rounded-md border border-red-200 bg-red-50 p-2 text-red-600 text-sm dark:border-red-800 dark:bg-red-950 dark:text-red-400"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{lastError}</span>
          </div>
        </div>
      )}
    </div>
  );
}
