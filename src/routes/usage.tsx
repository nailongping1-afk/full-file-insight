import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { api, errorLabel, usageStreamUrl } from "@/lib/api";
import {
  Badge,
  Btn,
  Card,
  Dot,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/usage")({
  head: () => ({
    meta: [
      { title: "Usage — EkaRouter" },
      { name: "description", content: "Token, biaya, dan riwayat request gateway EkaRouter." },
      { property: "og:title", content: "Usage — EkaRouter" },
      { property: "og:description", content: "Token, biaya, dan riwayat request gateway." },
    ],
  }),
  component: UsageView,
});

const PERIODS = ["today", "24h", "7d", "30d", "60d"] as const;

function fmt(n?: number) {
  if (typeof n !== "number") return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "—";
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-3">
      <p className="text-[10px] font-medium tracking-wider text-dim uppercase">{label}</p>
      <p className={cn("mt-1 text-[20px] leading-none font-semibold", tone)}>{value}</p>
    </Card>
  );
}

function UsageView() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("today");
  const [live, setLive] = useState(false);

  const stats = useQuery({
    queryKey: ["usage-stats", period],
    queryFn: () => api.usageStats(period),
    retry: false,
  });
  const history = useQuery({
    queryKey: ["usage-history", period],
    queryFn: () => api.usageHistory(period === "30d" || period === "60d" ? "7d" : period, 50),
    retry: false,
  });

  useEffect(() => {
    const es = new EventSource(usageStreamUrl(), { withCredentials: true });
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = () => {
      void stats.refetch();
      void history.refetch();
    };
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader
        icon={<BarChart3 />}
        title="Usage & Analytics"
        subtitle="Monitor your API usage, token consumption, and request logs"
        actions={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Dot tone={live ? "success" : "muted"} />
              {live ? "Live" : "Disconnected"}
            </span>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <Btn
                  key={p}
                  size="sm"
                  variant={period === p ? "primary" : "outline"}
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </Btn>
              ))}
            </div>
          </div>
        }
      />

      <div className="mx-auto max-w-[1180px] p-5 md:p-8">
        {stats.isLoading && <LoadingState label="Loading usage" />}
        {stats.isError && (
          <Card className="mb-4 p-0">
            <ErrorState message={errorLabel(stats.error)} onRetry={() => stats.refetch()} />
          </Card>
        )}
        {stats.isSuccess && (
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Stat label="Total requests" value={fmt(stats.data.totalRequests)} />
            <Stat label="Total input tokens" value={fmt(stats.data.totalInputTokens)} tone="text-primary-light" />
            <Stat label="Cached tokens" value={fmt(stats.data.cachedTokens)} tone="text-warning" />
            <Stat label="Output tokens" value={fmt(stats.data.outputTokens)} tone="text-success" />
            <Stat
              label="Est. cost"
              value={`~$${(stats.data.estimatedCostUsd ?? 0).toFixed(2)}`}
            />
          </div>
        )}

        <Card>
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-[12.5px] font-semibold">Recent requests</p>
            {history.isSuccess && <Badge tone="muted">{history.data.logs.length}</Badge>}
          </div>
          {history.isLoading && <LoadingState label="Loading requests" />}
          {history.isError && (
            <ErrorState message={errorLabel(history.error)} onRetry={() => history.refetch()} />
          )}
          {history.isSuccess && history.data.logs.length === 0 && <EmptyState label="No requests" />}
          {history.isSuccess && history.data.logs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-[11.5px]">
                <thead>
                  <tr className="text-left text-dim">
                    <th className="px-3 py-2 font-medium">Model</th>
                    <th className="px-3 py-2 font-medium">Provider</th>
                    <th className="px-3 py-2 text-right font-medium">In / Out</th>
                    <th className="px-3 py-2 text-right font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.logs.map((l, i) => (
                    <tr key={l.id ?? `${l.model}-${i}`} className="border-t border-border hover:bg-hover">
                      <td className="px-3 py-1.5 font-mono">{l.model}</td>
                      <td className="px-3 py-1.5 text-muted-foreground capitalize">
                        {l.provider ?? "—"}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono">
                        <span className="text-primary-light">{fmt(l.inputTokens)}↑</span>{" "}
                        <span className="text-success">{fmt(l.outputTokens)}↓</span>
                      </td>
                      <td className="px-3 py-1.5 text-right text-dim">{ago(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
