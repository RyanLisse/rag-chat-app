'use client';

import { AlertCircle, CheckCircle, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VectorStoreStats {
  totalSearches: number;
  lastSearchTime: string;
  lastQuery: string;
  successRate: number;
  averageResponseTime: number;
}

export function VectorStoreMonitor() {
  const [stats, setStats] = useState<VectorStoreStats | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Poll for stats every 5 seconds
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/vector-store/monitor');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch vector store stats:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Listen for search events
  useEffect(() => {
    const handleSearchStart = () => setIsSearching(true);
    const handleSearchEnd = () => setIsSearching(false);

    window.addEventListener('vector-search-start', handleSearchStart);
    window.addEventListener('vector-search-end', handleSearchEnd);

    return () => {
      window.removeEventListener('vector-search-start', handleSearchStart);
      window.removeEventListener('vector-search-end', handleSearchEnd);
    };
  }, []);

  if (!stats) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg z-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Vector Store Monitor
          </span>
          {isSearching ? (
            <Badge variant="default" className="animate-pulse">
              Searching...
            </Badge>
          ) : (
            <Badge variant="secondary">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Searches:</span>
          <span className="font-mono">{stats.totalSearches}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Success Rate:</span>
          <span className="font-mono">
            {(stats.successRate * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Avg Response Time:</span>
          <span className="font-mono">
            {stats.averageResponseTime.toFixed(0)}ms
          </span>
        </div>
        {stats.lastQuery && (
          <div className="pt-2 border-t">
            <div className="text-muted-foreground mb-1">Last Query:</div>
            <div className="text-xs font-mono truncate">{stats.lastQuery}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(stats.lastSearchTime).toLocaleTimeString()}
            </div>
          </div>
        )}
        <div className="pt-2 mt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            <span>Vector search enforced on all queries</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
