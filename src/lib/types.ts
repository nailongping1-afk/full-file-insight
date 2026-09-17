export interface Connection {
  id: string;
  provider: string;
  authType?: "apikey" | "oauth" | "none";
  name: string;
  displayName?: string;
  email?: string;
  priority?: number;
  globalPriority?: number;
  isActive: boolean;
  testStatus?: "active" | "unavailable" | "unknown";
  lastError?: string | null;
  lastErrorAt?: string | null;
  providerSpecificData?: {
    baseUrl?: string;
    connectionProxyEnabled?: boolean;
    connectionProxyUrl?: string;
    proxyPoolId?: string;
    apiType?: string;
    nodeName?: string;
    prefix?: string;
  };
  data?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConnectionsResponse {
  connections: Connection[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  providerOptions: string[];
  totals: { eligibleConnections: number; providerFilteredConnections: number };
}

export interface QuotaItem {
  name: string;
  used: number;
  total: number;
  remaining: number;
  unlimited?: boolean;
  resetAt?: string | null;
}

export interface ConnectionQuota {
  plan?: string;
  quotas: QuotaItem[];
  message?: string;
}

export interface ProxyPoolItem {
  id: string;
  name: string;
  isActive: boolean;
  testStatus?: string;
  type?: string;
  proxies?: string[];
  count?: number;
  lastTestedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  machineId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ComboItem {
  id: string;
  name: string;
  kind?: string;
  models: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UsageStats {
  totalRequests: number;
  totalInputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface UsageLogEntry {
  id?: string;
  model: string;
  provider?: string;
  inputTokens: number;
  outputTokens: number;
  costUsd?: number;
  createdAt: string;
}

export interface ModelItem {
  id: string;
  name?: string;
  provider?: string;
  contextLength?: number;
  capabilities?: string[];
}

export interface ProviderNode {
  id: string;
  type: string;
  name: string;
  data?: { baseUrl?: string; apiKey?: string; apiType?: string; prefix?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface HealthResponse {
  ok: boolean;
  status: string;
  time: string;
}

export interface VersionResponse {
  currentVersion?: string;
  latestVersion?: string;
  hasUpdate?: boolean;
  version?: string;
  backend?: string;
}

export interface InitResponse {
  initialized: boolean;
  hasPassword: boolean;
  requireLogin: boolean;
  authMode?: string;
  version?: string;
  machineId?: string;
}
