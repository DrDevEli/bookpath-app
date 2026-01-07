// API-specific types for BookPath application

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// API Endpoints
export interface ApiEndpoint {
  path: string;
  method: HttpMethod;
  description: string;
  requiresAuth: boolean;
  parameters?: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: ApiResponse[];
}

export interface ApiParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  example?: any;
}

export interface ApiRequestBody {
  type: 'object' | 'array';
  properties: Record<string, any>;
  required?: string[];
  example?: any;
}

export interface ApiResponse {
  status: number;
  description: string;
  schema: any;
  example?: any;
}

// Rate Limiting
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Caching
export interface CacheConfig {
  ttl: number;
  key: string;
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memory: number;
}

// WebSocket
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
  userId?: string;
}

export interface WebSocketConnection {
  id: string;
  userId?: string;
  connectedAt: number;
  lastActivity: number;
}

// File Upload
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

export interface UploadConfig {
  maxSize: number;
  allowedTypes: string[];
  destination: string;
  filename?: (req: any, file: FileUpload, cb: Function) => void;
}

// API Versioning
export interface ApiVersion {
  version: string;
  deprecated: boolean;
  sunsetDate?: string;
  migrationGuide?: string;
}

// Health Check
export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: HealthStatus;
    redis: HealthStatus;
    externalApis: HealthStatus;
  };
}

export interface HealthStatus {
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
  lastChecked: string;
}

// Metrics
export interface ApiMetrics {
  requests: {
    total: number;
    byMethod: Record<string, number>;
    byEndpoint: Record<string, number>;
    byStatus: Record<string, number>;
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
    byEndpoint: Record<string, number>;
  };
  cache: {
    hitRate: number;
    missRate: number;
    totalKeys: number;
  };
}

// Export all API types
export * from './endpoints';
export * from './validation'; 