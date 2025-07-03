'use client';

import {
  BarChart3Icon,
  DatabaseIcon,
  FileIcon,
  FileTextIcon,
  LinkIcon,
  ServerIcon,
  TargetIcon,
  TrendingUpIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { CitationStatistics } from '@/lib/types/citation';

interface CitationStatisticsPanelProps {
  statistics: CitationStatistics;
}

export function CitationStatisticsPanel({
  statistics,
}: CitationStatisticsPanelProps) {
  const sourceTypeIcons = {
    document: <FileTextIcon className="h-4 w-4" />,
    webpage: <LinkIcon className="h-4 w-4" />,
    api: <ServerIcon className="h-4 w-4" />,
    database: <DatabaseIcon className="h-4 w-4" />,
    file: <FileIcon className="h-4 w-4" />,
  };

  const maxSourceCount = useMemo(() => {
    return Math.max(...Object.values(statistics.sourceDistribution), 1);
  }, [statistics.sourceDistribution]);

  const relevanceColor = useMemo(() => {
    const score = statistics.avgRelevanceScore;
    if (score >= 0.8) {
      return 'text-green-600 dark:text-green-400';
    }
    if (score >= 0.6) {
      return 'text-yellow-600 dark:text-yellow-400';
    }
    return 'text-red-600 dark:text-red-400';
  }, [statistics.avgRelevanceScore]);

  const getQualityRating = (score: number) => {
    if (score >= 0.8) {
      return { label: 'Excellent', color: 'bg-green-500' };
    }
    if (score >= 0.6) {
      return { label: 'Good', color: 'bg-yellow-500' };
    }
    if (score >= 0.4) {
      return { label: 'Fair', color: 'bg-orange-500' };
    }
    return { label: 'Poor', color: 'bg-red-500' };
  };

  const qualityRating = getQualityRating(statistics.avgRelevanceScore);

  return (
    <div className="space-y-4 p-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <BarChart3Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-blue-700 dark:text-blue-300 text-xs font-medium">
                Total Citations
              </p>
              <p className="font-bold text-xl text-blue-900 dark:text-blue-100">
                {statistics.totalCitations}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-500/20">
              <TargetIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-green-700 dark:text-green-300 text-xs font-medium">
                Unique Sources
              </p>
              <p className="font-bold text-xl text-green-900 dark:text-green-100">
                {statistics.uniqueSources}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Relevance Score */}
      <Card className="p-4 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-900/10 dark:to-pink-900/10 border-purple-200/50 dark:border-purple-800/50">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <TrendingUpIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="font-semibold text-sm text-purple-900 dark:text-purple-100">
              Relevance Quality
            </span>
          </div>
          <Badge
            variant="secondary"
            className={`${qualityRating.color} border-none text-white shadow-sm`}
          >
            {qualityRating.label}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Average Score</span>
            <span className={`font-medium ${relevanceColor}`}>
              {(statistics.avgRelevanceScore * 100).toFixed(1)}%
            </span>
          </div>
          <Progress
            value={statistics.avgRelevanceScore * 100}
            className="h-2"
          />
          <p className="text-muted-foreground text-xs">
            Higher scores indicate more relevant and accurate citations
          </p>
        </div>
      </Card>

      {/* Source Distribution */}
      <Card className="p-4 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-900/10 dark:to-blue-900/10 border-indigo-200/50 dark:border-indigo-800/50">
        <div className="mb-3 flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/20">
            <FileTextIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="font-semibold text-sm text-indigo-900 dark:text-indigo-100">
            Source Types
          </span>
        </div>

        <div className="space-y-3">
          {Object.entries(statistics.sourceDistribution).map(
            ([type, count]) => {
              const percentage = (count / statistics.uniqueSources) * 100;
              const Icon = sourceTypeIcons[
                type as keyof typeof sourceTypeIcons
              ] || <FileIcon className="h-4 w-4" />;

              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {Icon}
                      <span className="capitalize">{type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{count}</span>
                      <span className="text-muted-foreground text-xs">
                        ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={(count / maxSourceCount) * 100}
                    className="h-1.5"
                  />
                </div>
              );
            }
          )}
        </div>
      </Card>

      {/* Citation Density */}
      <Card className="p-4 bg-gradient-to-br from-cyan-50/50 to-teal-50/50 dark:from-cyan-900/10 dark:to-teal-900/10 border-cyan-200/50 dark:border-cyan-800/50">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <BarChart3Icon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="font-semibold text-sm text-cyan-900 dark:text-cyan-100">
              Citation Density
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Citations per Source</p>
              <p className="font-medium">
                {statistics.uniqueSources > 0
                  ? (
                      statistics.totalCitations / statistics.uniqueSources
                    ).toFixed(1)
                  : '0'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Source Diversity</p>
              <p className="font-medium">
                {Object.keys(statistics.sourceDistribution).length} types
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Quality Insights */}
      <Card className="bg-gradient-to-br from-amber-50/30 to-orange-50/30 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-200/50 dark:border-amber-800/50 p-4">
        <h3 className="mb-2 font-semibold text-sm text-amber-900 dark:text-amber-100 flex items-center gap-2">
          <span className="text-lg">✨</span> Quality Insights
        </h3>
        <div className="space-y-2 text-muted-foreground text-xs">
          {statistics.avgRelevanceScore >= 0.8 ? (
            <p>✅ Excellent citation quality with highly relevant sources</p>
          ) : statistics.avgRelevanceScore >= 0.6 ? (
            <p>⚠️ Good citation quality, some sources could be more relevant</p>
          ) : (
            <p>❗ Citation quality needs improvement</p>
          )}

          {statistics.uniqueSources >= statistics.totalCitations * 0.7 ? (
            <p>✅ Good source diversity</p>
          ) : (
            <p>💡 Consider adding more diverse sources</p>
          )}

          {statistics.totalCitations >= 5 ? (
            <p>✅ Well-supported response with sufficient citations</p>
          ) : (
            <p>💡 Consider adding more citations for better support</p>
          )}
        </div>
      </Card>
    </div>
  );
}
