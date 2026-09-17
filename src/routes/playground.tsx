import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bot, Send, Square } from "lucide-react";
import { useRef, useState } from "react";
import { api, errorLabel, streamChat } from "@/lib/api";
import { Badge, Btn, Card, EmptyState, Input, PageHeader, Select } from "@/components/kit";

export const Route = createFileRoute("/playground")({
  head: () => ({
    meta: [
      { title: "Playground — EkaRouter" },
      { name: "description", content: "Uji model lewat gateway EkaRouter dengan streaming langsung." },
      { property: "og:title", content: "Playground — EkaRouter" },
      { property: "og:description", content: "Uji model lewat gateway dengan streaming langsung." },
    ],
  }),
  component: PlaygroundView,
});

type Msg = { role: "user" | "assistant"; content: string };

function PlaygroundView() {
  const models = useQuery({ queryKey: ["models"], queryFn: api.models, retry: false });
  const [model, setModel] = useState("");
  const [system, setSystem] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ttft, setTtft] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = async () => {
    if (!input.trim()) return;
    const next: Msg[] = [...messages, { role: "user", content: input.trim() }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setErr(null);
    setTtft(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const started = performance.now();
    let first = true;

    try {
      await streamChat(
        {
          model,
          temperature,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            ...next.map((m) => ({ role: m.role, content: m.content })),
          ],
        },
        (chunk) => {
          if (first) {
            setTtft(Math.round(performance.now() - started));
            first = false;
          }
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last) copy[copy.length - 1] = { ...last, content: last.content + chunk };
            return copy;
          });
        },
        controller.signal,
      );
    } catch (e) {
      setErr(errorLabel(e));
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const modelList = models.data?.data ?? [];

  return (
    <div>
      <PageHeader icon={<Bot />} title="Playground" subtitle="Test AI models through your gateway" />

      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-4 p-5 md:p-8 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit p-3">
          <p className="mb-1 text-[11px] text-dim">Model</p>
          {models.isError ? (
            <p className="mb-2 font-mono text-[11px] text-danger">{errorLabel(models.error)}</p>
          ) : (
            <Select
              className="mb-3 w-full"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="">
                {models.isLoading ? "Loading…" : modelList.length ? "Select model" : "No models"}
              </option>
              {modelList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}
                </option>
              ))}
            </Select>
          )}

          <p className="mb-1 text-[11px] text-dim">Temperature {temperature.toFixed(1)}</p>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="mb-3 w-full accent-[var(--color-primary)]"
            aria-label="Temperature"
          />

          <p className="mb-1 text-[11px] text-dim">System</p>
          <textarea
            value={system}
            onChange={(e) => setSystem(e.target.value)}
            rows={4}
            className="focus-ring w-full rounded-lg border border-border bg-hover p-2 text-[12px]"
            placeholder="Optional"
          />
          {ttft !== null && (
            <div className="mt-3">
              <Badge tone="primary">TTFT {ttft}ms</Badge>
            </div>
          )}
        </Card>

        <Card className="flex min-h-[420px] flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && <EmptyState label="No messages" />}
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`max-w-[88%] rounded-xl border border-border px-3 py-2 text-[12.5px] whitespace-pre-wrap ${
                  m.role === "user" ? "ml-auto bg-primary-subtle" : "bg-hover"
                }`}
              >
                {m.content || (streaming ? "…" : "")}
              </div>
            ))}
            {err && <p className="font-mono text-[11.5px] text-danger">{err}</p>}
          </div>

          <div className="flex items-center gap-2 border-t border-border p-2">
            <Input
              placeholder="Message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            {streaming ? (
              <Btn size="sm" variant="danger" onClick={() => abortRef.current?.abort()}>
                <Square className="h-3 w-3" />
                Stop
              </Btn>
            ) : (
              <Btn size="sm" variant="primary" onClick={send} disabled={!input.trim() || !model}>
                <Send className="h-3 w-3" />
                Send
              </Btn>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
