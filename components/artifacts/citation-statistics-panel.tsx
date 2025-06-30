'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { CitationStatistics } from '@/lib/types/citation';
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
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <BarChart3Icon className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-muted-foreground text-xs">Total Citations</p>
              <p className="font-semibold text-lg">
                {statistics.totalCitations}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <TargetIcon className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-muted-foreground text-xs">Unique Sources</p>
              <p className="font-semibold text-lg">
                {statistics.uniqueSources}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Relevance Score */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="h-4 w-4 text-purple-500" />
            <span className="font-medium text-sm">Relevance Quality</span>
          </div>
          <Badge
            variant="secondary"
            className={`${qualityRating.color} border-none text-white`}
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
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <FileTextIcon className="h-4 w-4 text-indigo-500" />
          <span className="font-medium text-sm">Source Types</span>
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
      <Card className="p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3Icon className="h-4 w-4 text-cyan-500" />
            <span className="font-medium text-sm">Citation Density</span>
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
      <Card className="bg-gray-50 p-4 dark:bg-gray-800/50">
        <h3 className="mb-2 font-medium text-sm">Quality Insights</h3>
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
