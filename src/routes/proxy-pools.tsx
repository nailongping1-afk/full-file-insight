import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Network, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { api, errorLabel } from "@/lib/api";
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Select,
  Toggle,
} from "@/components/kit";

export const Route = createFileRoute("/proxy-pools")({
  head: () => ({
    meta: [
      { title: "Proxy Pools — EkaRouter" },
      { name: "description", content: "Kelola relay dan pool proxy keluar untuk gateway EkaRouter." },
      { property: "og:title", content: "Proxy Pools — EkaRouter" },
      { property: "og:description", content: "Kelola relay dan pool proxy keluar." },
    ],
  }),
  component: ProxyPoolsView,
});

function ProxyPoolsView() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("socks5");
  const [proxies, setProxies] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const pools = useQuery({ queryKey: ["proxy-pools"], queryFn: api.proxyPools, retry: false });
  const refresh = () => qc.invalidateQueries({ queryKey: ["proxy-pools"] });

  const create = async () => {
    setErr(null);
    try {
      await api.createProxyPool({
        name,
        isActive: true,
        data: { type, proxies: proxies.split("\n").map((p) => p.trim()).filter(Boolean) },
      });
      setOpen(false);
      setName("");
      setProxies("");
      void refresh();
    } catch (e) {
      setErr(errorLabel(e));
    }
  };

  const active = (pools.data ?? []).filter((p) => p.isActive).length;

  return (
    <div>
      <PageHeader
        icon={<Network />}
        title="Proxy Pools"
        subtitle="Relays"
        actions={
          <Btn size="sm" variant="primary" onClick={() => setOpen(true)}>
            <Plus className="h-3 w-3" />
            Add pool
          </Btn>
        }
      />

      <div className="p-4 md:p-6">
        <Card>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <p className="text-[12.5px] font-semibold">Pools</p>
            {pools.isSuccess && (
              <>
                <Badge tone="muted">Total {pools.data.length}</Badge>
                <Badge tone="success">Active {active}</Badge>
              </>
            )}
          </div>

          {pools.isLoading && <LoadingState label="Loading pools" />}
          {pools.isError && <ErrorState message={errorLabel(pools.error)} onRetry={() => pools.refetch()} />}
          {pools.isSuccess && pools.data.length === 0 && <EmptyState label="No proxy pools" />}

          <ul>
            {(pools.data ?? []).map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2.5 hover:bg-hover"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-[12.5px] font-semibold">{p.name}</span>
                    {p.type && <Badge tone="muted">{p.type}</Badge>}
                    <Badge tone={p.isActive ? "success" : "muted"}>
                      {p.isActive ? "active" : "inactive"}
                    </Badge>
                    {typeof p.count === "number" && <Badge tone="muted">{p.count} bound</Badge>}
                  </div>
                  <p className="truncate font-mono text-[11px] text-dim">
                    {p.proxies?.[0] ?? "—"}
                  </p>
                  <p className="text-[10.5px] text-dim">
                    Last tested: {p.lastTestedAt ? new Date(p.lastTestedAt).toLocaleString() : "Never"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Toggle
                    checked={p.isActive}
                    label="Active"
                    onChange={() => {
                      /* backend tidak menyediakan endpoint update pool */
                    }}
                  />
                  <Btn
                    size="icon"
                    variant="ghost"
                    title="Test"
                    disabled={testing === p.id}
                    onClick={async () => {
                      setTesting(p.id);
                      await api.testProxyPool(p.id).catch(() => null);
                      setTesting(null);
                      void refresh();
                    }}
                  >
                    <FlaskConical className="h-[15px] w-[15px]" />
                  </Btn>
                  <Btn
                    size="icon"
                    variant="danger"
                    title="Delete"
                    onClick={async () => {
                      await api.deleteProxyPool(p.id).catch(() => null);
                      void refresh();
                    }}
                  >
                    <Trash2 className="h-[15px] w-[15px]" />
                  </Btn>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add proxy pool">
        <div className="flex flex-col gap-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="socks5">socks5</option>
            <option value="http">http</option>
            <option value="cloudflare">cloudflare relay</option>
            <option value="vercel">vercel relay</option>
            <option value="deno">deno relay</option>
          </Select>
          <textarea
            rows={5}
            value={proxies}
            onChange={(e) => setProxies(e.target.value)}
            placeholder="One URL per line"
            className="focus-ring w-full rounded-lg border border-border bg-hover p-2 font-mono text-[11.5px]"
          />
          {err && <p className="font-mono text-[11px] text-danger">{err}</p>}
          <div className="mt-1 flex justify-end gap-2">
            <Btn size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn size="sm" variant="primary" onClick={create} disabled={!name || !proxies.trim()}>
              Create
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
