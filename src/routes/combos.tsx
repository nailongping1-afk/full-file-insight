import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, Plus, Share2, Trash2 } from "lucide-react";
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
} from "@/components/kit";

export const Route = createFileRoute("/combos")({
  head: () => ({
    meta: [
      { title: "Combos — EkaRouter" },
      { name: "description", content: "Rantai model dan strategi fallback antar provider AI." },
      { property: "og:title", content: "Combos — EkaRouter" },
      { property: "og:description", content: "Rantai model dan strategi fallback." },
    ],
  }),
  component: CombosView,
});

function CombosView() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [models, setModels] = useState("");
  const [strategy, setStrategy] = useState("fallback");
  const [err, setErr] = useState<string | null>(null);

  const combos = useQuery({ queryKey: ["combos"], queryFn: api.combos, retry: false });

  const create = async () => {
    setErr(null);
    try {
      await api.createCombo({
        name,
        models: models.split(",").map((m) => m.trim()).filter(Boolean),
        strategy,
      });
      setOpen(false);
      setName("");
      setModels("");
      void qc.invalidateQueries({ queryKey: ["combos"] });
    } catch (e) {
      setErr(errorLabel(e));
    }
  };

  return (
    <div>
      <PageHeader
        icon={<Share2 />}
        title="Combo & Vision Adapter"
        subtitle="Build model chains and fallback strategies"
        actions={
          <Btn size="sm" variant="primary" onClick={() => setOpen(true)}>
            <Plus className="h-3 w-3" />
            New combo
          </Btn>
        }
      />

      <div className="mx-auto max-w-[1180px] p-5 md:p-8">
        {combos.isLoading && <LoadingState label="Loading combos" />}
        {combos.isError && (
          <Card className="p-0">
            <ErrorState message={errorLabel(combos.error)} onRetry={() => combos.refetch()} />
          </Card>
        )}
        {combos.isSuccess && combos.data.length === 0 && (
          <Card className="p-0">
            <EmptyState label="No combos" />
          </Card>
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {(combos.data ?? []).map((c) => (
            <Card key={c.id} className="p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate font-mono text-[12.5px] font-semibold">{c.name}</p>
                  <Badge tone="primary">{c.kind ?? "fallback"}</Badge>
                </div>
                <Btn
                  size="icon"
                  variant="danger"
                  title="Delete"
                  onClick={async () => {
                    await api.deleteCombo(c.id).catch(() => null);
                    void qc.invalidateQueries({ queryKey: ["combos"] });
                  }}
                >
                  <Trash2 className="h-[15px] w-[15px]" />
                </Btn>
              </div>
              <ol className="flex flex-col gap-1">
                {c.models.map((m, i) => (
                  <li key={`${c.id}-${m}`} className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-hover text-[10px] text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="truncate font-mono text-[11.5px]">{m}</span>
                    {i < c.models.length - 1 && <ArrowDown className="h-3 w-3 text-dim" />}
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New combo">
        <div className="flex flex-col gap-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder="Models, comma separated"
            value={models}
            onChange={(e) => setModels(e.target.value)}
          />
          <Select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
            <option value="fallback">fallback</option>
            <option value="capacity-adapter">capacity-adapter</option>
          </Select>
          {err && <p className="font-mono text-[11px] text-danger">{err}</p>}
          <div className="mt-1 flex justify-end gap-2">
            <Btn size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn size="sm" variant="primary" onClick={create} disabled={!name || !models}>
              Create
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
