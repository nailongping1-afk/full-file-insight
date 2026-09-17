import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { API_BASE_URL, api, errorLabel } from "@/lib/api";
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
} from "@/components/kit";

export const Route = createFileRoute("/endpoint")({
  head: () => ({
    meta: [
      { title: "Endpoint — EkaRouter" },
      { name: "description", content: "URL gateway dan pengelolaan API key EkaRouter." },
      { property: "og:title", content: "Endpoint — EkaRouter" },
      { property: "og:description", content: "URL gateway dan pengelolaan API key." },
    ],
  }),
  component: EndpointView,
});

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Btn
      size="icon"
      variant="ghost"
      title="Copy"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? <Check className="h-[15px] w-[15px] text-success" /> : <Copy className="h-[15px] w-[15px]" />}
    </Btn>
  );
}

function mask(key: string) {
  if (key.length <= 12) return key;
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

function EndpointView() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const keys = useQuery({ queryKey: ["keys"], queryFn: api.keys, retry: false });
  const base = `${API_BASE_URL}/v1`;

  const create = async () => {
    setErr(null);
    try {
      const res = await api.createKey(name);
      setCreated(res.key);
      setName("");
      void qc.invalidateQueries({ queryKey: ["keys"] });
    } catch (e) {
      setErr(errorLabel(e));
    }
  };

  return (
    <div>
      <PageHeader
        icon={<KeyRound />}
        title="Endpoint"
        subtitle="Manage gateway endpoints and API keys"
        actions={
          <Btn size="sm" variant="primary" onClick={() => setOpen(true)}>
            <Plus className="h-3 w-3" />
            New key
          </Btn>
        }
      />

      <div className="mx-auto max-w-[1180px] p-5 md:p-8">
        <Card className="mb-4 p-3">
          <div className="flex items-center justify-between gap-2">
            <code className="truncate font-mono text-[12.5px]">{base}</code>
            <CopyButton value={base} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="primary">OpenAI</Badge>
            <Badge tone="primary">Anthropic</Badge>
            <Badge tone="primary">Gemini</Badge>
            <Badge tone="muted">Codex</Badge>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-[12.5px] font-semibold">API keys</p>
            {keys.isSuccess && <Badge tone="muted">{keys.data.length}</Badge>}
          </div>
          {keys.isLoading && <LoadingState label="Loading keys" />}
          {keys.isError && <ErrorState message={errorLabel(keys.error)} onRetry={() => keys.refetch()} />}
          {keys.isSuccess && keys.data.length === 0 && <EmptyState label="No keys" />}
          {keys.isSuccess && keys.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-[11.5px]">
                <thead>
                  <tr className="text-left text-dim">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Key</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.data.map((k) => (
                    <tr key={k.id} className="border-t border-border hover:bg-hover">
                      <td className="px-3 py-1.5">{k.name}</td>
                      <td className="px-3 py-1.5 font-mono text-muted-foreground">{mask(k.key)}</td>
                      <td className="px-3 py-1.5">
                        <Badge tone={k.isActive ? "success" : "muted"}>
                          {k.isActive ? "active" : "off"}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex justify-end gap-1">
                          <CopyButton value={k.key} />
                          <Btn
                            size="icon"
                            variant="danger"
                            title="Delete"
                            onClick={async () => {
                              await api.deleteKey(k.id).catch(() => null);
                              void qc.invalidateQueries({ queryKey: ["keys"] });
                            }}
                          >
                            <Trash2 className="h-[15px] w-[15px]" />
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setCreated(null);
        }}
        title="New API key"
      >
        {created ? (
          <div className="flex flex-col gap-2">
            <code className="rounded-lg border border-border bg-hover p-2 font-mono text-[11.5px] break-all">
              {created}
            </code>
            <p className="text-[11px] text-dim">Salin sekarang, tidak ditampilkan lagi.</p>
            <div className="flex justify-end">
              <Btn
                size="sm"
                variant="primary"
                onClick={() => {
                  setOpen(false);
                  setCreated(null);
                }}
              >
                Done
              </Btn>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            {err && <p className="font-mono text-[11px] text-danger">{err}</p>}
            <div className="mt-1 flex justify-end gap-2">
              <Btn size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Btn>
              <Btn size="sm" variant="primary" onClick={create} disabled={!name}>
                Create
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
