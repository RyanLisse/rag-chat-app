// Log aggregation configuration
// This can be used with various log aggregation services like ELK, Datadog, or CloudWatch

export interface LogAggregationConfig {
  service: 'elasticsearch' | 'datadog' | 'cloudwatch' | 'custom';
  endpoint?: string;
  apiKey?: string;
  index?: string;
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
}

export const logAggregationConfig: LogAggregationConfig = {
  service: (process.env.LOG_AGGREGATION_SERVICE as any) || 'custom',
  endpoint: process.env.LOG_AGGREGATION_ENDPOINT,
  apiKey: process.env.LOG_AGGREGATION_API_KEY,
  index: process.env.LOG_AGGREGATION_INDEX || 'rag-chat-logs',
  batchSize: parseInt(process.env.LOG_BATCH_SIZE || '100'),
  flushInterval: parseInt(process.env.LOG_FLUSH_INTERVAL || '5000'), // 5 seconds
  maxRetries: parseInt(process.env.LOG_MAX_RETRIES || '3'),
};

// Log format for structured logging
export interface StructuredLog {
  timestamp: string;
  level: string;
  message: string;
  service: string;
  environment: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    type?: string;
  };
}

// Log aggregation client
export class LogAggregator {
  private buffer: StructuredLog[] = [];
  private timer: NodeJS.Timeout | null = null;
  
  constructor(private config: LogAggregationConfig) {
    this.startFlushTimer();
  }
  
  private startFlushTimer() {
    this.timer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }
  
  async log(entry: StructuredLog) {
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.config.batchSize) {
      await this.flush();
    }
  }
  
  async flush() {
    if (this.buffer.length === 0) return;
    
    const logs = [...this.buffer];
    this.buffer = [];
    
    try {
      await this.sendLogs(logs);
    } catch (error) {
      console.error('Failed to send logs to aggregation service:', error);
      // Put logs back in buffer for retry
      this.buffer = [...logs, ...this.buffer];
    }
  }
  
  private async sendLogs(logs: StructuredLog[]) {
    switch (this.config.service) {
      case 'elasticsearch':
        await this.sendToElasticsearch(logs);
        break;
      case 'datadog':
        await this.sendToDatadog(logs);
        break;
      case 'cloudwatch':
        await this.sendToCloudWatch(logs);
        break;
      case 'custom':
        await this.sendToCustomEndpoint(logs);
        break;
    }
  }
  
  private async sendToElasticsearch(logs: StructuredLog[]) {
    if (!this.config.endpoint) return;
    
    const bulkBody = logs.flatMap(log => [
      { index: { _index: this.config.index } },
      log,
    ]);
    
    const response = await fetch(`${this.config.endpoint}/_bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-ndjson',
        ...(this.config.apiKey && { 'Authorization': `ApiKey ${this.config.apiKey}` }),
      },
      body: bulkBody.map(item => JSON.stringify(item)).join('\n') + '\n',
    });
    
    if (!response.ok) {
      throw new Error(`Elasticsearch bulk insert failed: ${response.statusText}`);
    }
  }
  
  private async sendToDatadog(logs: StructuredLog[]) {
    if (!this.config.endpoint || !this.config.apiKey) return;
    
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': this.config.apiKey,
      },
      body: JSON.stringify(logs),
    });
    
    if (!response.ok) {
      throw new Error(`Datadog log submission failed: ${response.statusText}`);
    }
  }
  
  private async sendToCloudWatch(logs: StructuredLog[]) {
    // CloudWatch implementation would use AWS SDK
    // This is a placeholder
    console.log('CloudWatch logging not implemented');
  }
  
  private async sendToCustomEndpoint(logs: StructuredLog[]) {
    if (!this.config.endpoint) {
      // Just log to console if no endpoint configured
      logs.forEach(log => console.log(JSON.stringify(log)));
      return;
    }
    
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify({ logs }),
    });
    
    if (!response.ok) {
      throw new Error(`Custom log endpoint failed: ${response.statusText}`);
    }
  }
  
  shutdown() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    // Flush remaining logs
    return this.flush();
  }
}

// Create singleton instance
export const logAggregator = new LogAggregator(logAggregationConfig);