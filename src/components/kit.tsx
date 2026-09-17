import { Loader2, RefreshCw, Inbox } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card shadow-sm", className)}>{children}</div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[18px] font-semibold tracking-tight">{children}</h2>;
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "icon";
};

export function Btn({ variant = "outline", size = "md", className, ...props }: BtnProps) {
  return (
    <button
      {...props}
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-md border text-[13px] font-medium transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-9 px-3",
        size === "md" && "h-10 px-4",
        size === "icon" && "h-9 w-9 p-0",
        variant === "primary" && "border-primary bg-primary text-primary-foreground hover:opacity-90",
        variant === "outline" && "border-border bg-transparent hover:bg-hover",
        variant === "ghost" && "border-transparent bg-transparent text-muted-foreground hover:bg-hover hover:text-foreground",
        variant === "danger" && "border-transparent bg-transparent text-danger hover:bg-danger-subtle",
        className,
      )}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "focus-ring h-10 w-full rounded-md border border-border bg-hover px-3 text-[13px] placeholder:text-dim",
        className,
      )}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "focus-ring h-10 rounded-md border border-border bg-card px-3 text-[13px]",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function Badge({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "success" | "warning" | "danger" | "primary";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
        tone === "muted" && "bg-hover text-muted-foreground",
        tone === "success" && "bg-success-subtle text-success",
        tone === "warning" && "bg-warning-subtle text-warning",
        tone === "danger" && "bg-danger-subtle text-danger",
        tone === "primary" && "bg-primary-subtle text-primary-light",
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ tone = "muted" }: { tone?: "success" | "danger" | "warning" | "muted" }) {
  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full",
        tone === "success" && "bg-success",
        tone === "danger" && "bg-danger",
        tone === "warning" && "bg-warning",
        tone === "muted" && "bg-dim",
      )}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "focus-ring relative h-4.5 w-8 shrink-0 rounded-full border transition-colors",
        checked ? "border-primary bg-primary" : "border-border bg-hover",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
          checked ? "left-4" : "left-0.5",
        )}
      />
    </button>
  );
}

export function ProgressBar({ value, tone }: { value: number; tone: "success" | "warning" | "danger" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-hover">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          tone === "success" && "bg-success",
          tone === "warning" && "bg-warning",
          tone === "danger" && "bg-danger",
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-[13px] text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-[13px] text-dim">
      <Inbox className="h-4 w-4" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center gap-3 py-12 text-center">
      <p className="font-mono text-[13px] text-danger">{message}</p>
      {onRetry && (
        <Btn size="sm" onClick={onRetry}>
          <RefreshCw className="h-3 w-3" />
          Retry
        </Btn>
      )}
    </div>
  );
}

export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-5 py-2 md:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 text-primary-light [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        <div className="leading-tight">
          <h1 className="truncate text-[20px] font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="truncate text-[13px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
    </header>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-lg border border-border bg-card p-5 sm:max-w-md sm:rounded-lg"
      >
        <h3 className="mb-3 text-[13px] font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}
