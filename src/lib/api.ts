import type {
  ApiKey,
  ComboItem,
  Connection,
  ConnectionQuota,
  ConnectionsResponse,
  HealthResponse,
  InitResponse,
  ModelItem,
  ProviderNode,
  ProxyPoolItem,
  UsageLogEntry,
  UsageStats,
  VersionResponse,
} from "./types";

export const API_BASE_URL =
  (import.meta.env?.["VITE_API_BASE_URL"] as string | undefined) ?? "http://127.0.0.1:20128";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
      ...options,
    });
  } catch {
    throw new ApiError(0, "Daemon tidak terjangkau");
  }

  if (!res.ok) {
    let message = res.statusText || "Request failed";
    try {
      const data = (await res.json()) as { error?: string; message?: string };
      message = data.error || data.message || message;
    } catch {
      /* body kosong / bukan JSON */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function errorLabel(err: unknown): string {
  if (err instanceof ApiError) {
    return err.status === 0 ? err.message : `[${err.status}] ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

const qs = (params: Record<string, string | number | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== "all") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
};

export const api = {
  // System
  health: () => request<HealthResponse>("/api/health"),
  init: () => request<InitResponse>("/api/init"),
  version: () => request<VersionResponse>("/api/version"),
  setLocale: (locale: string) =>
    request<{ locale: string }>("/api/locale", {
      method: "POST",
      body: JSON.stringify({ locale }),
    }),

  // Auth
  authStatus: () => request<Record<string, unknown>>("/api/auth/status"),
  login: (password: string) =>
    request<Record<string, unknown>>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  logout: () => request<{ success: boolean }>("/api/auth/logout", { method: "POST" }),
  resetPassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Providers
  connections: (params: {
    page?: number;
    pageSize?: number;
    provider?: string;
    accountStatus?: string;
    search?: string;
  } = {}) => request<ConnectionsResponse>(`/api/providers/client${qs(params)}`),
  providers: () => request<Connection[]>("/api/providers"),
  provider: (id: string) => request<Connection>(`/api/providers/${id}`),
  createProvider: (body: Record<string, unknown>) =>
    request<Connection>("/api/providers", { method: "POST", body: JSON.stringify(body) }),
  updateProvider: (id: string, body: Record<string, unknown>) =>
    request<Connection>(`/api/providers/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProvider: (id: string) =>
    request<{ success: boolean }>(`/api/providers/${id}`, { method: "DELETE" }),
  validateProvider: (body: Record<string, unknown>) =>
    request<{ valid: boolean; message?: string; models?: string[] }>("/api/providers/validate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  testProvider: (id: string) =>
    request<{ success: boolean; latencyMs?: number; testStatus?: string; message?: string }>(
      `/api/providers/${id}/test`,
      { method: "POST" },
    ),
  providerModels: (id: string) =>
    request<{ models: ModelItem[] }>(`/api/providers/${id}/models`),

  // Custom nodes
  providerNodes: () => request<ProviderNode[]>("/api/provider-nodes"),
  createProviderNode: (body: Record<string, unknown>) =>
    request<ProviderNode>("/api/provider-nodes", { method: "POST", body: JSON.stringify(body) }),
  deleteProviderNode: (id: string) =>
    request<{ success: boolean }>(`/api/provider-nodes/${id}`, { method: "DELETE" }),

  // Proxy pools
  proxyPools: () => request<ProxyPoolItem[]>("/api/proxy-pools"),
  createProxyPool: (body: Record<string, unknown>) =>
    request<ProxyPoolItem>("/api/proxy-pools", { method: "POST", body: JSON.stringify(body) }),
  testProxyPool: (id: string) =>
    request<{ success: boolean; alive?: number; total?: number; latencyMs?: number }>(
      `/api/proxy-pools/${id}/test`,
      { method: "POST" },
    ),
  deleteProxyPool: (id: string) =>
    request<{ success: boolean }>(`/api/proxy-pools/${id}`, { method: "DELETE" }),

  // Combos
  combos: () => request<ComboItem[]>("/api/combos"),
  createCombo: (body: { name: string; models: string[]; strategy?: string }) =>
    request<ComboItem>("/api/combos", { method: "POST", body: JSON.stringify(body) }),
  updateCombo: (id: string, body: Record<string, unknown>) =>
    request<ComboItem>(`/api/combos/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteCombo: (id: string) =>
    request<{ success: boolean }>(`/api/combos/${id}`, { method: "DELETE" }),

  // Keys
  keys: () => request<ApiKey[]>("/api/keys"),
  createKey: (name: string) =>
    request<{ key: string; apiKey: ApiKey }>("/api/keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  deleteKey: (id: string) => request<{ success: boolean }>(`/api/keys/${id}`, { method: "DELETE" }),

  // Models
  models: () => request<{ data: ModelItem[] }>("/api/models"),

  // Usage
  connectionQuota: (id: string, force = false) =>
    request<ConnectionQuota>(`/api/usage/${id}${force ? "?force=1" : ""}`),
  usageStats: (period: string) => request<UsageStats>(`/api/usage/stats${qs({ period })}`),
  usageHistory: (period: string, limit = 50) =>
    request<{ logs: UsageLogEntry[] }>(`/api/usage/history${qs({ period, limit })}`),

  // Settings
  settings: () => request<Record<string, unknown>>("/api/settings"),
  updateSettings: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  exportDatabase: () => request<Record<string, unknown>>("/api/settings/database"),
  importDatabase: (body: unknown) =>
    request<{ success: boolean; imported: boolean }>("/api/settings/database", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export async function streamChat(
  payload: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
  },
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/chat/completions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ ...payload, stream: true }),
    signal,
  }).catch(() => {
    throw new ApiError(0, "Daemon tidak terjangkau");
  });

  if (!response.ok) {
    let msg = response.statusText;
    try {
      const j = (await response.json()) as { error?: string | { message?: string } };
      msg = (typeof j.error === "string" ? j.error : j.error?.message) || msg;
    } catch {
      /* noop */
    }
    throw new ApiError(response.status, msg);
  }
  if (!response.body) throw new ApiError(0, "Response kosong");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;
      if (!trimmed.startsWith("data:")) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (jsonStr === "[DONE]") return;
      try {
        const parsed = JSON.parse(jsonStr) as {
          choices?: Array<{ delta?: { content?: string }; text?: string }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.text ?? "";
        if (delta) onChunk(delta);
      } catch {
        onChunk(jsonStr);
      }
    }
  }
}

export function usageStreamUrl() {
  return `${API_BASE_URL}/api/usage/stream`;
}
