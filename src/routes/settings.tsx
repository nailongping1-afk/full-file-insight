import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Settings as SettingsIcon, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { API_BASE_URL, api, errorLabel } from "@/lib/api";
import {
  Badge,
  Btn,
  Card,
  Dot,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  SectionTitle,
  Toggle,
} from "@/components/kit";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — EkaRouter" },
      { name: "description", content: "Konfigurasi sistem, keamanan, dan cadangan basis data EkaRouter." },
      { property: "og:title", content: "Settings — EkaRouter" },
      { property: "og:description", content: "Konfigurasi sistem, keamanan, dan cadangan data." },
    ],
  }),
  component: SettingsView,
});

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5 first:border-t-0">
      <span className="text-[12px]">{label}</span>
      {children}
    </div>
  );
}

function SettingsView() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings, retry: false });
  const health = useQuery({ queryKey: ["health"], queryFn: api.health, retry: false });
  const version = useQuery({ queryKey: ["version"], queryFn: api.version, retry: false });
  const [note, setNote] = useState<string | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const s = settings.data ?? {};
  const bool = (k: string) => Boolean(s[k]);

  const patch = async (key: string, value: unknown) => {
    setNote(null);
    try {
      await api.updateSettings({ [key]: value });
      void settings.refetch();
    } catch (e) {
      setNote(errorLabel(e));
    }
  };

  const backup = async () => {
    setNote(null);
    try {
      const data = await api.exportDatabase();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ekarouter-backup.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setNote(errorLabel(e));
    }
  };

  const restore = async (file: File) => {
    setNote(null);
    try {
      await api.importDatabase(JSON.parse(await file.text()));
      setNote("Restored");
    } catch (e) {
      setNote(errorLabel(e));
    }
  };

  return (
    <div>
      <PageHeader icon={<SettingsIcon />} title="Settings" subtitle="System preferences and security" />

      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-4 p-5 md:p-8 lg:grid-cols-2">
        <Card>
          <div className="border-b border-border px-3 py-2">
            <SectionTitle>System</SectionTitle>
          </div>
          <Row label="Daemon">
            <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <Dot tone={health.isSuccess ? "success" : "danger"} />
              {health.isLoading ? "Checking" : health.isSuccess ? "Online" : "Offline"}
            </span>
          </Row>
          <Row label="Base URL">
            <code className="truncate font-mono text-[11.5px] text-muted-foreground">
              {API_BASE_URL}
            </code>
          </Row>
          <Row label="Version">
            <Badge tone="muted">
              {version.data?.currentVersion ?? version.data?.version ?? "—"}
            </Badge>
          </Row>
          <Row label="Backend">
            <Badge tone="muted">{version.data?.backend ?? "—"}</Badge>
          </Row>
        </Card>

        <Card>
          <div className="border-b border-border px-3 py-2">
            <SectionTitle>Security</SectionTitle>
          </div>
          {settings.isLoading && <LoadingState label="Loading settings" />}
          {settings.isError && (
            <ErrorState message={errorLabel(settings.error)} onRetry={() => settings.refetch()} />
          )}
          {settings.isSuccess && (
            <>
              <Row label="Require API key">
                <Toggle
                  checked={bool("requireApiKey")}
                  label="Require API key"
                  onChange={(v) => patch("requireApiKey", v)}
                />
              </Row>
              <Row label="Require login">
                <Toggle
                  checked={bool("requireLogin")}
                  label="Require login"
                  onChange={(v) => patch("requireLogin", v)}
                />
              </Row>
            </>
          )}
          <div className="border-t border-border p-3">
            <p className="mb-2 text-[11px] text-dim">Change password</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="password"
                placeholder="Current"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
              <Input
                type="password"
                placeholder="New"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
              <Btn
                size="md"
                variant="primary"
                disabled={!current || !next}
                onClick={async () => {
                  setNote(null);
                  try {
                    await api.resetPassword(current, next);
                    setCurrent("");
                    setNext("");
                    setNote("Password updated");
                  } catch (e) {
                    setNote(errorLabel(e));
                  }
                }}
              >
                Save
              </Btn>
            </div>
          </div>
        </Card>

        <Card>
          <div className="border-b border-border px-3 py-2">
            <SectionTitle>Backup</SectionTitle>
          </div>
          <div className="flex flex-wrap gap-2 p-3">
            <Btn size="sm" onClick={backup}>
              <Download className="h-3 w-3" />
              Export
            </Btn>
            <Btn size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3 w-3" />
              Restore
            </Btn>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              aria-label="Restore backup"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void restore(f);
              }}
            />
          </div>
        </Card>
      </div>

      {note && (
        <p className="px-4 pb-6 font-mono text-[11.5px] text-muted-foreground md:px-6">{note}</p>
      )}
    </div>
  );
}
