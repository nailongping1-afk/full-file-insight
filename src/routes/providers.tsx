import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Server } from "lucide-react";
import { useMemo, useState } from "react";
import { api, errorLabel } from "@/lib/api";
import type { Connection } from "@/lib/types";
import {
  Badge,
  Btn,
  Card,
  Dot,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  SectionTitle,
  Select,
} from "@/components/kit";

export const Route = createFileRoute("/providers")({
  head: () => ({
    meta: [
      { title: "Providers — EkaRouter" },
      { name: "description", content: "Kelola koneksi provider AI: OAuth, API key, dan node custom." },
      { property: "og:title", content: "Providers — EkaRouter" },
      { property: "og:description", content: "Kelola koneksi provider AI di EkaRouter." },
    ],
  }),
  component: ProvidersView,
});

function ProviderCard({ name, count }: { name: string; count: number }) {
  return (
    <Card className="flex items-center gap-2.5 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hover text-[11px] font-semibold uppercase">
        {name.slice(0, 2)}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[13px] font-semibold capitalize">{name}</p>
        {count > 0 ? (
          <p className="flex items-center gap-1 text-[11px] text-success">
            <Dot tone="success" />
            {count} connected
          </p>
        ) : (
          <p className="text-[11px] text-dim">No connections</p>
        )}
      </div>
    </Card>
  );
}

function AddNodeModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState("openai-compatible");
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.createProviderNode({ type, name, data: { baseUrl, apiKey } });
      onDone();
      onClose();
    } catch (e) {
      setErr(errorLabel(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add custom provider">
      <div className="flex flex-col gap-2">
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="openai-compatible">OpenAI compatible</option>
          <option value="anthropic-compatible">Anthropic compatible</option>
        </Select>
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Base URL" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
        <Input
          placeholder="API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          type="password"
        />
        {err && <p className="font-mono text-[11px] text-danger">{err}</p>}
        <div className="mt-1 flex justify-end gap-2">
          <Btn size="sm" onClick={onClose}>
            Cancel
          </Btn>
          <Btn size="sm" variant="primary" onClick={submit} disabled={busy || !name}>
            Save
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function ProvidersView() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);

  const list = useQuery({
    queryKey: ["connections", "providers-view"],
    queryFn: () => api.connections({ pageSize: 300 }),
    retry: false,
  });
  const nodes = useQuery({ queryKey: ["provider-nodes"], queryFn: api.providerNodes, retry: false });

  const grouped = useMemo(() => {
    const conns: Connection[] = list.data?.connections ?? [];
    const options = list.data?.providerOptions ?? [];
    const counts = new Map<string, number>();
    for (const c of conns) {
      if (c.isActive) counts.set(c.provider, (counts.get(c.provider) ?? 0) + 1);
    }
    const names = Array.from(new Set([...options, ...conns.map((c) => c.provider)]));
    return names
      .filter((n) => n.toLowerCase().includes(search.toLowerCase()))
      .map((n) => ({ name: n, count: counts.get(n) ?? 0 }));
  }, [list.data, search]);

  const showCustom = filter === "all" || filter === "custom";
  const showConnected = filter === "all" || filter === "connected";

  return (
    <div>
      <PageHeader icon={<Server />} title="Providers" subtitle="Connections" />

      <div className="p-4 md:p-6">
        <Card className="mb-4 flex flex-wrap items-center gap-2 p-2">
          <div className="relative min-w-[160px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
            <Input
              className="pl-7"
              placeholder="Search providers"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="custom">Custom</option>
            <option value="connected">Connected</option>
          </Select>
          <Btn size="sm" variant="primary" onClick={() => setModal(true)}>
            <Plus className="h-3 w-3" />
            Add custom
          </Btn>
        </Card>

        {showCustom && (
          <section className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <SectionTitle>Custom nodes</SectionTitle>
              {nodes.isSuccess && <Badge tone="muted">{nodes.data.length}</Badge>}
            </div>
            {nodes.isLoading && <LoadingState label="Loading nodes" />}
            {nodes.isError && (
              <Card className="p-0">
                <ErrorState message={errorLabel(nodes.error)} onRetry={() => nodes.refetch()} />
              </Card>
            )}
            {nodes.isSuccess && nodes.data.length === 0 && (
              <Card className="p-0">
                <EmptyState label="No custom providers" />
              </Card>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {(nodes.data ?? []).map((n) => (
                <Card key={n.id} className="p-3">
                  <p className="truncate text-[13px] font-semibold">{n.name}</p>
                  <p className="truncate text-[11px] text-dim">{n.data?.baseUrl ?? n.type}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge tone="primary">{n.type}</Badge>
                    <Btn
                      size="sm"
                      variant="danger"
                      onClick={async () => {
                        await api.deleteProviderNode(n.id).catch(() => null);
                        void qc.invalidateQueries({ queryKey: ["provider-nodes"] });
                      }}
                    >
                      Delete
                    </Btn>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {showConnected && (
          <section>
            <div className="mb-2 flex items-center gap-2">
              <SectionTitle>Providers</SectionTitle>
              {list.isSuccess && <Badge tone="muted">{grouped.length}</Badge>}
            </div>
            {list.isLoading && <LoadingState label="Loading providers" />}
            {list.isError && (
              <Card className="p-0">
                <ErrorState message={errorLabel(list.error)} onRetry={() => list.refetch()} />
              </Card>
            )}
            {list.isSuccess && grouped.length === 0 && (
              <Card className="p-0">
                <EmptyState label="No providers" />
              </Card>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {grouped.map((g) => (
                <ProviderCard key={g.name} name={g.name} count={g.count} />
              ))}
            </div>
          </section>
        )}
      </div>

      <AddNodeModal
        open={modal}
        onClose={() => setModal(false)}
        onDone={() => qc.invalidateQueries({ queryKey: ["provider-nodes"] })}
      />
    </div>
  );
}
