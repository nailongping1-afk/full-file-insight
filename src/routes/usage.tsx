import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Minus,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Btn, Dot } from "@/components/kit";
import { api, errorLabel, usageStreamUrl } from "@/lib/api";
import type { UsageLogEntry, UsageStats } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/usage")({
  head: () => ({
    meta: [
      { title: "Usage Analytics — EkaRouter" },
      { name: "description", content: "Analitik penggunaan token, biaya, model, dan request EkaRouter." },
      { property: "og:title", content: "Usage Analytics — EkaRouter" },
      { property: "og:description", content: "Analitik penggunaan token, biaya, model, dan request EkaRouter." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsageView,
});

const PERIODS = ["today", "24h", "7d", "30d", "60d"] as const;
type Period = (typeof PERIODS)[number];

const EMPTY_STATS: UsageStats = {
  totalRequests: 0,
  totalInputTokens: 0,
  cachedTokens: 0,
  outputTokens: 0,
  estimatedCostUsd: 0,
};

function fmt(n?: number) {
  if (typeof n !== "number") return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, notation: n >= 10_000 ? "compact" : "standard" }).format(n);
}

function money(n?: number) {
  const value = n ?? 0;
  return value < 0.01 && value > 0 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`;
}

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "—";
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

function StatCard({ label, value, tone, note }: { label: string; value: string; tone?: string; note?: string }) {
  return (
    <div className="min-h-[86px] rounded-lg border border-border bg-card px-4 py-3.5 shadow-sm">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</p>
      <p className={cn("mt-2 font-mono text-[20px] leading-none font-bold", tone)}>{value}</p>
      {note && <p className="mt-2 text-[8px] text-dim">{note}</p>}
    </div>
  );
}

function Segmented<T extends string>({ items, value, onChange }: { items: readonly T[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="inline-flex h-8 items-center rounded-md border border-border bg-card-inactive p-0.5">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            "focus-ring h-7 rounded-[4px] px-3 text-[10px] font-medium transition-colors",
            value === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item === "today" ? "Today" : item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function ConnectionMap({ logs }: { logs: UsageLogEntry[] }) {
  const nodes = useMemo(() => {
    const seen = new Set<string>();
    return logs
      .flatMap((log) => [log.provider, log.model])
      .filter((value): value is string => Boolean(value))
      .filter((value) => !seen.has(value) && Boolean(seen.add(value)))
      .slice(0, 14);
  }, [logs]);

  return (
    <div className="relative h-[278px] overflow-hidden rounded-lg border border-border bg-card-inactive">
      <div className="absolute inset-0 opacity-40 tech-grid" />
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        {nodes.map((_, index) => {
          const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
          const x = 50 + Math.cos(angle) * 35;
          const y = 50 + Math.sin(angle) * 34;
          return <line key={index} x1="50%" y1="50%" x2={`${x}%`} y2={`${y}%`} stroke="var(--color-primary)" strokeOpacity="0.35" />;
        })}
      </svg>
      <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-md border border-primary bg-primary-subtle px-2.5 py-1.5 font-mono text-[9px] text-primary-light">
        <Activity className="h-3 w-3" /> router
      </div>
      {nodes.map((node, index) => {
        const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
        return (
          <div
            key={node}
            className="absolute max-w-[120px] -translate-x-1/2 -translate-y-1/2 truncate rounded-sm border border-border bg-card px-2 py-1 font-mono text-[8px] shadow-sm"
            style={{ left: `${50 + Math.cos(angle) * 38}%`, top: `${50 + Math.sin(angle) * 36}%` }}
            title={node}
          >
            <Dot tone={index % 4 === 0 ? "warning" : "success"} /> <span className="ml-1">{node}</span>
          </div>
        );
      })}
      {nodes.length === 0 && (
        <p className="absolute right-0 bottom-8 left-0 text-center text-[10px] text-dim">No routing activity</p>
      )}
      <div className="absolute bottom-3 left-3 flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm">
        <button type="button" aria-label="Zoom in" className="focus-ring grid h-6 w-6 place-items-center hover:bg-hover"><Plus className="h-3 w-3" /></button>
        <button type="button" aria-label="Zoom out" className="focus-ring grid h-6 w-6 place-items-center border-t border-border hover:bg-hover"><Minus className="h-3 w-3" /></button>
      </div>
    </div>
  );
}

function Requests({ logs }: { logs: UsageLogEntry[] }) {
  return (
    <div className="h-[278px] overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-3 py-2 text-[9px] font-semibold text-muted-foreground uppercase">Recent requests</div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-border px-3 py-2 text-[8px] font-semibold text-dim uppercase">
        <span>Model</span><span>In / Out</span><span>When</span>
      </div>
      <div className="max-h-[224px] overflow-y-auto">
        {logs.length === 0 && <p className="py-20 text-center text-[10px] text-dim">No requests</p>}
        {logs.map((log, index) => (
          <div key={log.id ?? `${log.model}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 border-b border-border px-3 py-1.5 text-[9px] hover:bg-hover">
            <span className="truncate font-mono text-foreground"><Dot tone="success" /> <span className="ml-1">{log.model}</span></span>
            <span className="font-mono"><span className="text-primary-light">{fmt(log.inputTokens)}↑</span> <span className="text-success">{fmt(log.outputTokens)}↓</span></span>
            <span className="text-dim">{ago(log.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsageView() {
  const [period, setPeriod] = useState<Period>("today");
  const [view, setView] = useState<"Overview" | "Details">("Overview");
  const [metric, setMetric] = useState<"Tokens" | "Cost">("Tokens");
  const [tableMetric, setTableMetric] = useState<"Costs" | "Tokens">("Costs");
  const [live, setLive] = useState(false);

  const statsQuery = useQuery({ queryKey: ["usage-stats", period], queryFn: () => api.usageStats(period), retry: false });
  const historyQuery = useQuery({ queryKey: ["usage-history", period], queryFn: () => api.usageHistory(period, 100), retry: false });

  useEffect(() => {
    const stream = new EventSource(usageStreamUrl(), { withCredentials: true });
    stream.onopen = () => setLive(true);
    stream.onerror = () => setLive(false);
    stream.onmessage = () => { void statsQuery.refetch(); void historyQuery.refetch(); };
    return () => stream.close();
  }, []);

  const stats = statsQuery.data ?? EMPTY_STATS;
  const logs = historyQuery.data?.logs ?? [];
  const failed = statsQuery.isError || historyQuery.isError;
  const error = statsQuery.error ?? historyQuery.error;

  const chartData = useMemo(() => {
    const buckets = new Map<string, { label: string; tokens: number; cost: number }>();
    logs.forEach((log) => {
      const date = new Date(log.createdAt);
      if (Number.isNaN(date.getTime())) return;
      const label = period === "today" || period === "24h"
        ? date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
        : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const bucket = buckets.get(label) ?? { label, tokens: 0, cost: 0 };
      bucket.tokens += log.inputTokens + log.outputTokens;
      bucket.cost += log.costUsd ?? 0;
      buckets.set(label, bucket);
    });
    return Array.from(buckets.values()).reverse();
  }, [logs, period]);

  const modelRows = useMemo(() => {
    const rows = new Map<string, { model: string; provider: string; requests: number; input: number; output: number; cost: number; latest: string }>();
    logs.forEach((log) => {
      const row = rows.get(log.model) ?? { model: log.model, provider: log.provider ?? "—", requests: 0, input: 0, output: 0, cost: 0, latest: log.createdAt };
      row.requests += 1;
      row.input += log.inputTokens;
      row.output += log.outputTokens;
      row.cost += log.costUsd ?? 0;
      if (new Date(log.createdAt) > new Date(row.latest)) row.latest = log.createdAt;
      rows.set(log.model, row);
    });
    return Array.from(rows.values());
  }, [logs]);

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-5 md:px-6 md:py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented items={["Overview", "Details"] as const} value={view} onChange={setView} />
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[9px] text-dim"><Dot tone={live ? "success" : "muted"} />{live ? "Live" : "Disconnected"}</span>
          <Segmented items={PERIODS} value={period} onChange={setPeriod} />
        </div>
      </div>

      {failed && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-[10px] text-danger">
          <CircleAlert className="h-3.5 w-3.5" />
          <span>Data gagal diambil: {errorLabel(error)}</span>
          <Btn size="sm" variant="danger" className="ml-auto h-7 px-2 text-[10px]" onClick={() => { void statsQuery.refetch(); void historyQuery.refetch(); }}><RefreshCw className="h-3 w-3" /> Retry</Btn>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Total requests" value={fmt(stats.totalRequests)} />
        <StatCard label="Total input tokens" value={fmt(stats.totalInputTokens)} tone="text-primary-light" />
        <StatCard label="Cached tokens" value={fmt(stats.cachedTokens)} tone="text-primary-light" />
        <StatCard label="Output tokens" value={fmt(stats.outputTokens)} tone="text-success" />
        <StatCard label="Est. cost" value={`~${money(stats.estimatedCostUsd)}`} tone="text-warning" note="Estimated, not actual billing" />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <ConnectionMap logs={logs} />
        <Requests logs={logs} />
      </div>

      <section className="mt-4 overflow-hidden rounded-lg border border-border bg-card px-4 pt-3 pb-2">
        <Segmented items={["Tokens", "Cost"] as const} value={metric} onChange={setMetric} />
        <div className="mt-2 h-[205px]">
          {chartData.length === 0 ? (
            <div className="grid h-full place-items-center text-[10px] text-dim">No usage data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 3" vertical />
                <XAxis dataKey="label" tick={{ fill: "var(--color-dim)", fontSize: 8 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--color-dim)", fontSize: 8 }} axisLine={false} tickLine={false} tickFormatter={(value) => metric === "Tokens" ? fmt(value) : money(value)} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 10 }} formatter={(value) => metric === "Tokens" ? fmt(Number(value)) : money(Number(value))} />
                <Area type="monotone" dataKey={metric === "Tokens" ? "tokens" : "cost"} stroke="var(--color-primary)" strokeWidth={1.5} fill="url(#usageFill)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="mt-4 flex items-center justify-between">
        <button type="button" className="focus-ring flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3 text-[10px] font-semibold"><span>Usage by Model</span><ChevronDown className="h-3.5 w-3.5" /></button>
        <Segmented items={["Costs", "Tokens"] as const} value={tableMetric} onChange={setTableMetric} />
      </div>
      <div className="mt-2 overflow-x-auto rounded-lg border border-border bg-card px-5 py-4">
        <table className="w-full min-w-[760px] text-[9px]">
          <thead className="text-left text-[8px] font-semibold text-muted-foreground uppercase">
            <tr><th className="py-3">Model</th><th>Provider</th><th className="text-right">Requests</th><th className="text-right">Last used</th><th className="text-right">Input cost</th><th className="text-right">Cached cost</th><th className="text-right">Output cost</th><th className="text-right">Total cost</th></tr>
          </thead>
          <tbody>
            {modelRows.length === 0 && <tr><td colSpan={8} className="border-t border-border py-8 text-center text-[10px] text-dim">No model usage</td></tr>}
            {modelRows.map((row) => (
              <tr key={row.model} className="border-t border-border hover:bg-hover">
                <td className="py-3 font-mono font-semibold"><ChevronRight className="mr-2 inline h-3 w-3 text-dim" />{row.model}</td>
                <td className="text-dim">{row.provider}</td><td className="text-right font-mono">{row.requests}</td><td className="text-right text-dim">{ago(row.latest)}</td>
                <td className="text-right font-mono">{tableMetric === "Tokens" ? fmt(row.input) : money(row.cost)}</td><td className="text-right text-dim">—</td><td className="text-right font-mono">{tableMetric === "Tokens" ? fmt(row.output) : "$0.00"}</td><td className="text-right font-mono font-semibold text-warning">{tableMetric === "Tokens" ? fmt(row.input + row.output) : money(row.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}