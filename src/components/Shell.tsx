import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  Gauge,
  KeyRound,
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
  { to: "/", label: "Quota", icon: Gauge },
  { to: "/providers", label: "Providers", icon: Server },
  { to: "/combos", label: "Combos", icon: Share2 },
  { to: "/usage", label: "Usage", icon: BarChart3 },
  { to: "/endpoint", label: "Endpoint", icon: KeyRound },
  { to: "/playground", label: "Playground", icon: Bot },
] as const;

const SYSTEM = [
  { to: "/proxy-pools", label: "Proxy Pools", icon: Network },
  { to: "/settings", label: "Settings", icon: Settings },
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
        <Icon className="h-[17px] w-[17px]" />
        {label}
      </Link>
    );
  };

  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {MAIN.map((n) => item(n.to, n.label, n.icon))}
      <p className="mt-4 px-2.5 pb-1 text-[10px] font-medium tracking-wider text-dim uppercase">
        System
      </p>
      {SYSTEM.map((n) => item(n.to, n.label, n.icon))}
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
      <div className="flex items-center gap-1.5 px-4 pt-3.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
      </div>
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[13px] font-bold text-primary-foreground">
          E
        </span>
        <div className="leading-tight">
          <p className="text-[13px] font-bold">EkaRouter</p>
          <p className="text-[10.5px] text-dim">
            v{version.data?.currentVersion ?? version.data?.version ?? "1.0"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <NavList onNavigate={onNavigate} />
      </div>

      <div className="border-t border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
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
      <aside className="hidden w-[178px] shrink-0 border-r border-border lg:block">
        <div className="fixed top-0 bottom-0 w-[178px]">
          <SidebarBody />
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            role="presentation"
          />
          <div className="absolute top-0 bottom-0 left-0 w-[200px] border-r border-border">
            <SidebarBody onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="tech-grid flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-background/80 px-3 py-2 backdrop-blur lg:hidden">
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

        <div className="hidden justify-end px-4 pt-3 lg:flex">
          <ThemeButton dark={dark} toggle={toggle} />
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
