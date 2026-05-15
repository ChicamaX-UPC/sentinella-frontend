import type { ReactNode } from "react";

type Variant = "default" | "accent" | "critical" | "blue";

const ring: Record<Variant, string> = {
  default: "border-l-slate-500",
  accent: "border-l-accent",
  critical: "border-l-red-500",
  blue: "border-l-accent-blue",
};

export function KpiStatCard({
  label,
  value,
  hint,
  icon,
  variant = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  variant?: Variant;
}) {
  return (
    <article
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-surface-elevated/90 ${ring[variant]} border-l-[3px] pl-4 pr-3 py-4`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-50">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        {icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-400">{icon}</div>
        ) : null}
      </div>
    </article>
  );
}
