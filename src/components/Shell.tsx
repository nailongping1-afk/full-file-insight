import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  Boxes,
  Cable,
  ChevronDown,
  Code2,
  Cpu,
  Gauge,
  Grid2X2,
  KeyRound,
  Languages,
  Laptop,
  Library,
  Logs,
  Menu,
  Moon,
  Network,
  Server,
  Settings,
  Share2,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Dot } from "@/components/kit";

const MAIN = [
  { to: "/endpoint", label: "Endpoint & Key", icon: KeyRound },
  { to: "/providers", label: "Providers", icon: Server },
  { to: "/combos", label: "Combo & Vision Adapter", icon: Share2 },
  { to: "/usage", label: "Usage", icon: BarChart3 },
  { to: "/", label: "Quota Tracker", icon: Gauge },
  { to: "/playground", label: "Playground", icon: Bot },
] as const;

const SYSTEM = [
  { label: "Media Providers", icon: Library },
  { to: "/proxy-pools", label: "Proxy Pools", icon: Network },
  { label: "Skills", icon: Boxes },
  { label: "Console Log", icon: Logs },
  { label: "Remote", icon: Laptop },
  { label: "Languages", icon: Languages },
] as const;

function useTheme() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const stored = localStorage.getItem("ekarouter-theme");
    const isDark = stored !== "light";
    setDark(isDark);
    document.documentElement.classList.toggle("light", !isDark);
  }, []);
  const toggle = () => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("light", !next);
      localStorage.setItem("ekarouter-theme", next ? "dark" : "light");
      return next;
    });
  };
  return { dark, toggle };
}

function NavList({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const item = (to: string, label: string, Icon: typeof Gauge) => {
    const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
    return (
      <Link
        key={to}
        to={to}
        onClick={onNavigate}
        className={cn(
          "focus-ring relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] transition-colors",
          active
            ? "bg-primary-subtle font-medium text-primary-light"
            : "text-muted-foreground hover:bg-hover hover:text-foreground",
        )}
      >
        {active && (
          <span className="absolute top-1/2 -left-2 h-[18px] w-[3px] -translate-y-1/2 rounded-r-sm bg-primary" />
        )}
        <Icon className="h-[19px] w-[19px] shrink-0" />
        {label}
      </Link>
    );
  };

  return (
    <nav className="flex flex-col gap-1 px-3">
      {MAIN.map((n) => item(n.to, n.label, n.icon))}
      <p className="mt-5 px-3 pb-1 text-[11px] font-semibold tracking-wider text-dim uppercase">
        System
      </p>
      {SYSTEM.map((n) => "to" in n ? item(n.to, n.label, n.icon) : (
        <div key={n.label} className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-muted-foreground opacity-80">
          <n.icon className="h-[19px] w-[19px] shrink-0" />
          <span>{n.label}</span>
          {n.label === "Media Providers" && <ChevronDown className="ml-auto h-4 w-4" />}
        </div>
      ))}
      {item("/settings", "Settings", Settings)}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    retry: false,
    refetchInterval: 30_000,
  });
  const version = useQuery({ queryKey: ["version"], queryFn: api.version, retry: false });
  const online = health.isSuccess;

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-2 px-5 pt-4">
        <span className="h-2.5 w-2.5 rounded-full bg-traffic-red" />
        <span className="h-2.5 w-2.5 rounded-full bg-traffic-yellow" />
        <span className="h-2.5 w-2.5 rounded-full bg-traffic-green" />
      </div>
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Cable className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="text-[16px] font-bold">EkaRouter</p>
          <p className="mt-1 text-[11px] text-dim">
            v{version.data?.currentVersion ?? version.data?.version ?? "1.0"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <NavList onNavigate={onNavigate} />
      </div>

      <div className="border-t border-border px-5 py-3.5">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Dot tone={online ? "success" : health.isLoading ? "warning" : "danger"} />
          <span className="font-mono">Go Daemon :20128</span>
        </div>
        <p className="mt-0.5 pl-3.5 text-[10.5px] text-dim">
          {health.isLoading ? "Checking" : online ? "Online" : "Offline"}
        </p>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      <aside className="hidden w-[250px] shrink-0 border-r border-border md:block">
        <div className="fixed top-0 bottom-0 w-[250px]">
          <SidebarBody />
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-overlay"
            onClick={() => setOpen(false)}
            role="presentation"
          />
          <div className="absolute top-0 bottom-0 left-0 w-[250px] border-r border-border">
            <SidebarBody onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="tech-grid flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-between gap-2 border-b border-border bg-background/80 px-4 backdrop-blur md:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            className="focus-ring rounded-lg p-1.5 hover:bg-hover"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <span className="text-[13px] font-semibold">EkaRouter</span>
          <ThemeButton dark={dark} toggle={toggle} />
        </div>

        <div className="hidden h-0 md:block">
          <div className="fixed top-3 right-5 z-30 flex items-center gap-3 text-muted-foreground">
            <ThemeButton dark={dark} toggle={toggle} />
            <span className="text-[12px] font-medium">US</span>
            <Grid2X2 className="h-5 w-5" />
          </div>
        </div>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function ThemeButton({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="focus-ring rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground"
    >
      {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}
