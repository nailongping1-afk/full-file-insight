import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gauge, Pencil, RefreshCw, Timer, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { api, errorLabel } from "@/lib/api";
import type { Connection, QuotaItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  ProgressBar,
  Select,
  Toggle,
} from "@/components/kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quota — EkaRouter" },
      { name: "description", content: "Pantau sisa kuota tiap akun provider AI di EkaRouter." },
      { property: "og:title", content: "Quota — EkaRouter" },
      { property: "og:description", content: "Pantau sisa kuota tiap akun provider AI." },
    ],
  }),
  component: QuotaView,
});

function pctTone(pct: number) {
  return pct > 70 ? "success" : pct >= 30 ? "warning" : "danger";
}

function resetLabel(resetAt?: string | null) {
  if (!resetAt) return null;
  const diff = new Date(resetAt).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  if (diff <= 0) return "Reset now";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `Resets in ${h > 0 ? `${h}h ` : ""}${m}m`;
}

function quotaPct(q: QuotaItem) {
  if (q.unlimited) return 100;
  if (typeof q.total === "number" && q.total > 0) {
    return Math.round(((q.total - q.used) / q.total) * 100);
  }
  return typeof q.remaining === "number" ? q.remaining : 0;
}

function QuotaCard({ conn, onChanged }: { conn: Connection; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const quota = useQuery({
    queryKey: ["quota", conn.id],
    queryFn: () => api.connectionQuota(conn.id),
    retry: false,
  });

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      await api.updateProvider(conn.id, { isActive: next });
      onChanged();
    } catch {
      /* status error tampil lewat refetch */
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Hapus koneksi ini?")) return;
    setBusy(true);
    try {
      await api.deleteProvider(conn.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={conn.isActive ? "" : "bg-card-inactive opacity-70"}>
      <div className="flex items-start justify-between gap-2 border-b border-border p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hover text-[11px] font-semibold uppercase">
            {conn.provider.slice(0, 2)}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-semibold capitalize">{conn.provider}</p>
            <p className="truncate text-[11px] text-dim">
              {conn.email || conn.displayName || conn.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Btn
            variant="ghost"
            size="icon"
            title="Refresh"
            disabled={busy}
            onClick={() => {
              void api
                .connectionQuota(conn.id, true)
                .catch(() => null)
                .finally(() => quota.refetch());
            }}
          >
            <RefreshCw className={`h-[15px] w-[15px] ${quota.isFetching ? "animate-spin" : ""}`} />
          </Btn>
          <Btn variant="ghost" size="icon" title="Edit" disabled>
            <Pencil className="h-[15px] w-[15px]" />
          </Btn>
          <Btn variant="danger" size="icon" title="Delete" onClick={remove} disabled={busy}>
            <Trash2 className="h-[15px] w-[15px]" />
          </Btn>
          <Toggle checked={conn.isActive} onChange={toggle} label="Active" />
        </div>
      </div>

      <div className="p-3">
        {quota.isLoading && <LoadingState label="Loading quota" />}
        {quota.isError && (
          <p className="py-3 text-center font-mono text-[11px] text-danger">
            {errorLabel(quota.error)}
          </p>
        )}
        {quota.isSuccess && quota.data.quotas.length === 0 && <EmptyState label="No quota data" />}
        {quota.isSuccess &&
          quota.data.quotas.map((q) => {
            const pct = quotaPct(q);
            return (
              <div key={q.name} className="mb-3 last:mb-0">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-[11.5px] text-muted-foreground">{q.name}</span>
                  <span
                    className={cn(
                      "text-[11.5px] font-medium",
                      pctTone(pct) === "success" && "text-success",
                      pctTone(pct) === "warning" && "text-warning",
                      pctTone(pct) === "danger" && "text-danger",
                    )}
                  >
                    {q.unlimited ? "∞" : `${pct}%`}
                  </span>
                </div>
                <ProgressBar value={pct} tone={pctTone(pct)} />
                {resetLabel(q.resetAt) && (
                  <p className="mt-1 text-[10.5px] text-dim">{resetLabel(q.resetAt)}</p>
                )}
              </div>
            );
          })}
      </div>
    </Card>
  );
}

function QuotaView() {
  const qc = useQueryClient();
  const [provider, setProvider] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [expiringFirst, setExpiringFirst] = useState(false);

  const list = useQuery({
    queryKey: ["connections", provider, status, search],
    queryFn: () =>
      api.connections({ pageSize: 300, provider, accountStatus: status, search }),
    retry: false,
  });

  const connections = useMemo(() => {
    const items = list.data?.connections ?? [];
    return expiringFirst ? [...items].sort((a, b) => Number(b.isActive) - Number(a.isActive)) : items;
  }, [list.data, expiringFirst]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["connections"] });
    void qc.invalidateQueries({ queryKey: ["quota"] });
  };

  return (
    <div>
      <PageHeader icon={<Gauge />} title="Quota Tracker" subtitle="Track and manage your API quota limits" />

      <div className="mx-auto max-w-[1180px] p-5 md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-end gap-2">
          <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="all">All providers</option>
            {(list.data?.providerOptions ?? []).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All accounts</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <div className="min-w-[180px] md:max-w-[260px]">
            <Input
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Btn
            size="sm"
            variant={expiringFirst ? "primary" : "outline"}
            onClick={() => setExpiringFirst((v) => !v)}
          >
            <Timer className="h-3 w-3" />
            Expiring first
          </Btn>
          <Btn size="sm" onClick={refresh}>
            <RefreshCw className={`h-3 w-3 ${list.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Btn>
          {list.isSuccess && (
            <Badge tone="muted">{list.data.pagination?.total ?? connections.length} accounts</Badge>
          )}
        </div>

        {list.isLoading && <LoadingState label="Loading quota" />}
        {list.isError && <ErrorState message={errorLabel(list.error)} onRetry={() => list.refetch()} />}
        {list.isSuccess && connections.length === 0 && <EmptyState label="No accounts" />}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {connections.map((c) => (
            <QuotaCard key={c.id} conn={c} onChanged={refresh} />
          ))}
        </div>
      </div>
    </div>
  );
}
